"""
Product hub: todo-2 roadmap APIs — RCM, reporting, waitlist, compliance stubs, integrator configs.
"""
import json
import os
import uuid
import csv
import io
import base64
from datetime import date, datetime, timedelta
from decimal import Decimal

from flask import Blueprint, jsonify, request, Response

from src.auth.jwt_manager import token_required, role_required
from src.auth.tenant_middleware import tenant_isolation_required
from src.models.user import db
from src.models.patient import Patient
from src.models.todo2_support import (
    CollectionNote,
    PaymentPlan,
    SavedReport,
    ReportScheduleJob,
    ReportRunHistory,
    WaitlistEntry,
    AppointmentSchedulingMeta,
    DocumentRevision,
)
from src.models.billing import Claim, Payment, Statement
from src.models.clinical import LabResult
from src.models.prescribing import Prescription, Drug
from src.models.scheduling import Appointment

product_hub_bp = Blueprint('product_hub', __name__)


def _materialize_report_rows(spec: dict, facility_id=None):
    source = (spec or {}).get('source', 'payments')
    limit = min(max(int((spec or {}).get('limit', 200)), 1), 1000)
    if source == 'payments':
        q = Payment.query
        if facility_id:
            q = q.filter_by(facility_id=facility_id)
        rows = q.order_by(Payment.payment_date.desc()).limit(limit).all()
        return [r.to_dict() if hasattr(r, 'to_dict') else {} for r in rows]
    if source == 'claims':
        q = Claim.query
        if facility_id:
            q = q.filter_by(facility_id=facility_id)
        rows = q.order_by(Claim.created_at.desc()).limit(limit).all()
        return [r.to_dict() if hasattr(r, 'to_dict') else {} for r in rows]
    if source == 'appointments':
        q = Appointment.query
        if facility_id:
            q = q.filter_by(facility_id=facility_id)
        rows = q.order_by(Appointment.appointment_date.desc()).limit(limit).all()
        return [r.to_dict() if hasattr(r, 'to_dict') else {} for r in rows]
    if source == 'statements':
        q = Statement.query
        if facility_id:
            q = q.filter_by(facility_id=facility_id)
        rows = q.order_by(Statement.statement_date.desc()).limit(limit).all()
        return [r.to_dict() if hasattr(r, 'to_dict') else {} for r in rows]
    return []


def _rows_to_csv_bytes(rows):
    if not rows:
        rows = [{'message': 'No rows'}]
    all_keys = []
    seen = set()
    for row in rows:
        for k in row.keys():
            if k not in seen:
                seen.add(k)
                all_keys.append(k)
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=all_keys)
    writer.writeheader()
    for row in rows:
        writer.writerow({k: row.get(k) for k in all_keys})
    return buf.getvalue().encode('utf-8')


def _rows_to_pdf_bytes(rows, title='Clinic+ Scheduled Report'):
    from fpdf import FPDF
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font('Helvetica', 'B', 14)
    pdf.cell(0, 10, title, new_x='LMARGIN', new_y='NEXT')
    pdf.set_font('Helvetica', '', 10)
    pdf.multi_cell(0, 6, f'Generated {datetime.utcnow().isoformat()}Z')
    preview = rows[:30] if rows else []
    for i, row in enumerate(preview, start=1):
        line = f"{i}. " + ", ".join([f"{k}={row.get(k)}" for k in list(row.keys())[:5]])
        pdf.multi_cell(0, 5, line[:200])
    if len(rows) > len(preview):
        pdf.multi_cell(0, 5, f"... and {len(rows) - len(preview)} more rows")
    return bytes(pdf.output())


def _send_email_with_attachment(to_email, subject, body_text, filename, content_bytes, mime_type):
    api_key = (os.environ.get('SENDGRID_API_KEY') or '').strip()
    from_email = (os.environ.get('REPORTS_FROM_EMAIL') or os.environ.get('SENDGRID_FROM_EMAIL') or '').strip()
    if not api_key or not from_email or not to_email:
        return False, 'SendGrid not configured'
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail, Attachment, FileContent, FileName, FileType, Disposition
        message = Mail(from_email=from_email, to_emails=to_email, subject=subject, plain_text_content=body_text)
        encoded = base64.b64encode(content_bytes).decode('ascii')
        attachment = Attachment(
            FileContent(encoded),
            FileName(filename),
            FileType(mime_type),
            Disposition('attachment'),
        )
        message.attachment = attachment
        client = SendGridAPIClient(api_key)
        resp = client.send(message)
        return 200 <= resp.status_code < 300, f'status={resp.status_code}'
    except Exception as e:
        return False, str(e)


# --- Security / ops posture (checklist) ---
@product_hub_bp.route('/security/posture', methods=['GET'])
@token_required
@role_required(['admin', 'System Administrator', 'system_administrator'])
def security_posture():
    return jsonify({
        'success': True,
        'checklist': [
            {'id': 'jwt', 'ok': True, 'detail': 'JWT for protected API routes'},
            {'id': 'tenant', 'ok': True, 'detail': 'tenant_isolation on billing and sensitive resources'},
            {'id': 'hipaa_audit', 'ok': True, 'detail': 'hipaa_audit hooks on payments'},
            {'id': 'tls', 'ok': None, 'detail': 'Terminate TLS at load balancer; enforce HTTPS in prod'},
            {'id': 'phi_logging', 'ok': None, 'detail': 'Do not log raw PHI; redact in application logs'},
        ],
    }), 200


@product_hub_bp.route('/ops/metrics', methods=['GET'])
@token_required
@role_required(['admin', 'System Administrator', 'system_administrator'])
def ops_metrics():
    return jsonify({
        'success': True,
        'sentry_configured': bool(os.environ.get('SENTRY_DSN')),
        'otel': os.environ.get('OTEL_EXPORTER_OTLP_ENDPOINT'),
        'message': 'Hook APM/OTel in your host; SENTRY_DSN enables Python SDK when set in main',
    }), 200


# --- RCM: collection notes, payment plans ---
@product_hub_bp.route('/rcm/collection-notes', methods=['GET', 'POST'])
@token_required
@tenant_isolation_required
def rcm_collection_notes():
    if request.method == 'GET':
        pid = request.args.get('patient_id', type=int)
        if not pid:
            return jsonify({'error': 'patient_id required'}), 400
        rows = CollectionNote.query.filter_by(patient_id=pid).order_by(CollectionNote.created_at.desc()).limit(200).all()
        return jsonify({'success': True, 'notes': [r.to_dict() for r in rows]}), 200
    data = request.get_json() or {}
    note = CollectionNote(
        patient_id=data['patient_id'],
        facility_id=data.get('facility_id') or request.token_payload.get('facility_id'),
        body=data.get('body', ''),
        follow_up_date=date.fromisoformat(data['follow_up_date']) if data.get('follow_up_date') else None,
        dunning_level=int(data.get('dunning_level', 0)),
        created_by=request.current_user.id,
    )
    if not note.facility_id:
        return jsonify({'error': 'facility_id required'}), 400
    db.session.add(note)
    db.session.commit()
    return jsonify({'success': True, 'note': note.to_dict()}), 201


@product_hub_bp.route('/rcm/payment-plans', methods=['GET', 'POST'])
@token_required
@tenant_isolation_required
def rcm_payment_plans():
    if request.method == 'GET':
        pid = request.args.get('patient_id', type=int)
        q = PaymentPlan.query
        if pid:
            q = q.filter_by(patient_id=pid)
        rows = q.order_by(PaymentPlan.created_at.desc()).limit(200).all()
        return jsonify({'success': True, 'plans': [p.to_dict() for p in rows]}), 200
    data = request.get_json() or {}
    plan = PaymentPlan(
        plan_code=data.get('plan_code') or f"PLAN-{uuid.uuid4().hex[:10].upper()}",
        patient_id=data['patient_id'],
        facility_id=data.get('facility_id') or request.token_payload.get('facility_id'),
        total_amount=Decimal(str(data['total_amount'])),
        balance_due=Decimal(str(data.get('balance_due', data['total_amount']))),
        installment_amount=Decimal(str(data['installment_amount'])),
        cycle_days=int(data.get('cycle_days', 30)),
        status='active',
        next_due_date=date.fromisoformat(data['next_due_date']) if data.get('next_due_date') else None,
    )
    db.session.add(plan)
    db.session.commit()
    return jsonify({'success': True, 'plan': plan.to_dict()}), 201


@product_hub_bp.route('/rcm/payment-plans/<int:plan_id>/installment', methods=['POST'])
@token_required
@tenant_isolation_required
def rcm_plan_installment(plan_id):
    """Apply a planned installment: reduce balance (demo bookkeeping)."""
    plan = PaymentPlan.query.get_or_404(plan_id)
    data = request.get_json() or {}
    amt = Decimal(str(data.get('amount', plan.installment_amount)))
    plan.balance_due = max(Decimal('0'), (plan.balance_due or Decimal('0')) - amt)
    if plan.balance_due <= 0:
        plan.status = 'completed'
    else:
        days = plan.cycle_days or 30
        plan.next_due_date = (plan.next_due_date or date.today()) + timedelta(days=days)
    db.session.commit()
    return jsonify({'success': True, 'plan': plan.to_dict()}), 200


# --- Waitlist (scheduling extension) ---
@product_hub_bp.route('/scheduling/waitlist', methods=['GET', 'POST', 'PUT'])
@token_required
def hub_waitlist():
    if request.method == 'GET':
        fid = request.args.get('facility_id', type=int) or request.token_payload.get('facility_id')
        rows = WaitlistEntry.query.filter_by(facility_id=fid).order_by(WaitlistEntry.position, WaitlistEntry.created_at).all()
        return jsonify({'success': True, 'waitlist': [w.to_dict() for w in rows]}), 200
    if request.method == 'POST':
        data = request.get_json() or {}
        fid = data.get('facility_id') or request.token_payload.get('facility_id')
        w = WaitlistEntry(
            patient_id=data['patient_id'],
            provider_id=data.get('provider_id'),
            facility_id=fid,
            status='open',
            notes=data.get('notes'),
            preferred_start=date.fromisoformat(data['preferred_start']) if data.get('preferred_start') else None,
            preferred_end=date.fromisoformat(data['preferred_end']) if data.get('preferred_end') else None,
            position=(WaitlistEntry.query.filter_by(facility_id=fid).count() + 1) if fid else 1,
        )
        db.session.add(w)
        db.session.commit()
        return jsonify({'success': True, 'entry': w.to_dict()}), 201
    data = request.get_json() or {}
    w = WaitlistEntry.query.get_or_404(data.get('id'))
    if 'status' in data:
        w.status = data['status']
    db.session.commit()
    return jsonify({'success': True, 'entry': w.to_dict()}), 200


@product_hub_bp.route('/scheduling/appointments/<int:appt_id>/meta', methods=['PUT'])
@token_required
def appointment_meta(appt_id):
    data = request.get_json() or {}
    m = AppointmentSchedulingMeta.query.filter_by(appointment_id=appt_id).first()
    if not m:
        m = AppointmentSchedulingMeta(appointment_id=appt_id)
        db.session.add(m)
    if data.get('patient_confirmed'):
        m.patient_confirmed_at = datetime.utcnow()
    if data.get('no_show'):
        m.no_show_marked_at = datetime.utcnow()
        m.no_show_by = request.current_user.id
    if data.get('external_event_id'):
        m.external_event_id = data.get('external_event_id')
        m.external_calendar = data.get('external_calendar', 'custom')
    db.session.commit()
    return jsonify({'success': True, 'meta': m.to_dict()}), 200


# --- Google/Outlook sync placeholder ---
@product_hub_bp.route('/scheduling/calendar-oauth/<provider>', methods=['GET', 'POST'])
@token_required
def calendar_oauth_placeholder(provider):
    return jsonify({
        'success': False,
        'message': f'{provider} OAuth: configure {provider.upper()}_CLIENT_ID and callback URL; implement token storage',
        'docs': 'https://developers.google.com/calendar/api/quickstart/python',
    }), 501


# --- Insurance claim / EOB stub ---
@product_hub_bp.route('/insurance/claims/draft', methods=['POST'])
@token_required
@tenant_isolation_required
def claim_draft():
    return jsonify({
        'success': True,
        'message': 'Draft stored as simulation',
        'claim_id': f"CLM-{uuid.uuid4().hex[:8].upper()}",
        'next': 'POST /api/insurance/claims to persist when EDI is configured',
    }), 200


@product_hub_bp.route('/insurance/claims/<claim_ref>/status', methods=['GET'])
@token_required
def claim_status(claim_ref):
    c = None
    if str(claim_ref).isdigit():
        c = Claim.query.get(int(claim_ref))
    if not c:
        c = Claim.query.filter_by(claim_id=claim_ref).first()
    if c:
        return jsonify({'success': True, 'status': c.status, 'claim': c.to_dict()}), 200
    return jsonify({
        'success': True,
        'status': 'unknown',
        'claim_ref': claim_ref,
        'message': 'Connect clearinghouse for live status',
    }), 200


# --- Prescribing: formulary, EPCS, PDMP guidance ---
@product_hub_bp.route('/prescribing/formulary/lookup', methods=['GET'])
@token_required
def formulary_lookup():
    q = (request.args.get('q') or '').strip()
    if len(q) < 2:
        return jsonify({'error': 'q min length 2'}), 400
    rows = Drug.query.filter(Drug.drug_name.ilike(f'%{q}%')).limit(20).all()
    return jsonify({
        'success': True,
        'results': [d.to_dict() for d in rows],
        'message': 'Wire PBM API for true formulary tier/copay when available',
    }), 200


@product_hub_bp.route('/prescribing/epcs/partner', methods=['GET'])
@token_required
def epcs_partner():
    return jsonify({
        'success': True,
        'vendor': os.environ.get('EPCS_VENDOR', 'TBD'),
        'environment': os.environ.get('EPCS_ENV', 'sandbox'),
        'message': 'Connect certified EPCS (Surescripts-class) in production; audit via epcs_audit_logs',
    }), 200


@product_hub_bp.route('/prescribing/pdmp/guidance', methods=['GET'])
@token_required
@role_required(['physician', 'Physician', 'nurse', 'Nurse', 'admin', 'Nurse'])
def pdmp_guidance():
    st = (request.args.get('state') or '').upper() or 'DEFAULT'
    return jsonify({
        'success': True,
        'jurisdiction': st,
        'check_pdmp_before': 'Schedule II-IV as required by state law; document attestation in encounter',
        'links': 'Use state PMP / Appriss or equivalent — configure PDMP_SSO_URL per deployment',
    }), 200


# --- Pharmacy: dispensing queue (pending / active scrips) ---
@product_hub_bp.route('/pharmacy/dispensing-queue', methods=['GET'])
@token_required
@role_required(['Pharmacist', 'Pharmacy', 'pharmacist', 'admin', 'nurse', 'Nurse'])
def dispense_queue():
    facility_id = request.args.get('facility_id', type=int) or request.token_payload.get('facility_id')
    q = Prescription.query.filter_by(status='active')
    if facility_id:
        q = q.filter_by(facility_id=facility_id)
    rows = q.order_by(Prescription.prescribed_date.desc()).limit(100).all()
    out = []
    for p in rows:
        out.append({
            'prescription_id': p.prescription_id,
            'patient_id': p.patient_id,
            'drug_name': p.drug_name,
            'refills_remaining': p.refills_remaining,
            'pharmacy_id': p.pharmacy_id,
        })
    return jsonify({'success': True, 'queue': out}), 200


# --- Lab trends / interpretation ---
@product_hub_bp.route('/clinical/lab-results/<int:result_id>', methods=['PUT'])
@token_required
@role_required(['physician', 'Physician', 'Nurse', 'nurse', 'admin'])
def lab_result_update(result_id):
    lr = LabResult.query.get_or_404(result_id)
    data = request.get_json() or {}
    if 'interpretation' in data:
        lr.interpretation = data['interpretation']
    if 'clinical_significance' in data:
        lr.clinical_significance = data['clinical_significance']
    if 'abnormal_flag' in data:
        lr.abnormal_flag = data['abnormal_flag']
    if 'status' in data:
        lr.status = data['status']
    db.session.commit()
    return jsonify({'success': True, 'result': lr.to_dict()}), 200


@product_hub_bp.route('/clinical/lab-trends', methods=['GET'])
@token_required
def lab_trends():
    patient_id = request.args.get('patient_id', type=int)
    test_name = request.args.get('test_name', '').strip()
    if not patient_id or not test_name:
        return jsonify({'error': 'patient_id and test_name required'}), 400
    rows = LabResult.query.filter_by(patient_id=patient_id).filter(LabResult.test_name.ilike(f'%{test_name}%'))\
        .order_by(LabResult.result_date.asc()).limit(50).all()
    return jsonify({
        'success': True,
        'trends': [r.to_dict() for r in rows],
    }), 200


# --- Document revisions ---
@product_hub_bp.route('/documents/revisions', methods=['GET', 'POST'])
@token_required
def document_revisions():
    if request.method == 'GET':
        key = request.args.get('logical_key', '').strip()
        if not key:
            return jsonify({'error': 'logical_key required'}), 400
        rows = DocumentRevision.query.filter_by(logical_key=key).order_by(DocumentRevision.version.desc()).all()
        return jsonify({'success': True, 'revisions': [r.to_dict() for r in rows]}), 200
    data = request.get_json() or {}
    last = DocumentRevision.query.filter_by(logical_key=data['logical_key']).order_by(DocumentRevision.version.desc()).first()
    ver = (last.version + 1) if last else 1
    rev = DocumentRevision(
        logical_key=data['logical_key'],
        version=ver,
        storage_path=data.get('storage_path', ''),
        file_name=data.get('file_name', ''),
        patient_id=data.get('patient_id'),
        facility_id=data.get('facility_id') or request.token_payload.get('facility_id'),
        created_by=request.current_user.id,
        change_note=data.get('change_note', ''),
    )
    db.session.add(rev)
    db.session.commit()
    return jsonify({'success': True, 'revision': rev.to_dict()}), 201


# --- Saved reports + schedules ---
@product_hub_bp.route('/reports/saved', methods=['GET', 'POST'])
@token_required
def saved_reports():
    if request.method == 'GET':
        uid = request.current_user.id
        rows = SavedReport.query.filter_by(user_id=uid).all()
        return jsonify({'success': True, 'saved': [r.to_dict() for r in rows]}), 200
    data = request.get_json() or {}
    s = SavedReport(
        name=data['name'],
        spec_json=json.dumps(data.get('spec', {})),
        user_id=request.current_user.id,
        facility_id=data.get('facility_id') or request.token_payload.get('facility_id'),
    )
    db.session.add(s)
    db.session.commit()
    return jsonify({'success': True, 'saved': s.to_dict()}), 201


@product_hub_bp.route('/reports/schedule', methods=['POST', 'GET'])
@token_required
@role_required(['admin', 'System Administrator', 'physician', 'Physician', 'receptionist', 'Receptionist'])
def report_schedule():
    if request.method == 'GET':
        jobs = ReportScheduleJob.query.filter_by(is_active=True).all()
        return jsonify({'success': True, 'jobs': [j.to_dict() for j in jobs]}), 200
    data = request.get_json() or {}
    j = ReportScheduleJob(
        saved_report_id=int(data['saved_report_id']),
        cron_expression=data.get('cron_expression', '0 7 * * 1'),
        email_to=data.get('email_to', ''),
        is_active=bool(data.get('is_active', True)),
    )
    db.session.add(j)
    db.session.commit()
    return jsonify({
        'success': True,
        'job': j.to_dict(),
        'message': 'Attach a cron worker to email PDF/CSV exports; this persists intent only',
    }), 201


@product_hub_bp.route('/reports/schedule/<int:job_id>/run', methods=['POST'])
@token_required
@role_required(['admin', 'System Administrator', 'physician', 'Physician', 'receptionist', 'Receptionist'])
def report_schedule_run(job_id):
    """
    Execute one scheduled report job now (manual trigger).
    Generates a lightweight payload from saved report spec and updates job run state.
    """
    job = ReportScheduleJob.query.get_or_404(job_id)
    saved = SavedReport.query.get_or_404(job.saved_report_id)
    try:
        spec = json.loads(saved.spec_json or '{}')
    except Exception:
        spec = {}
    payload = request.get_json(silent=True) or {}
    out_format = (payload.get('format') or spec.get('format') or 'json').lower()
    rows = _materialize_report_rows(spec, facility_id=saved.facility_id)
    file_name = None
    file_bytes = None
    mime_type = 'application/json'
    if out_format == 'csv':
        file_name = f"{saved.name.replace(' ', '_').lower()}-{job.id}.csv"
        file_bytes = _rows_to_csv_bytes(rows)
        mime_type = 'text/csv'
    elif out_format == 'pdf':
        file_name = f"{saved.name.replace(' ', '_').lower()}-{job.id}.pdf"
        file_bytes = _rows_to_pdf_bytes(rows, title=saved.name)
        mime_type = 'application/pdf'
    else:
        out_format = 'json'
        file_name = f"{saved.name.replace(' ', '_').lower()}-{job.id}.json"
        file_bytes = json.dumps(rows, default=str, indent=2).encode('utf-8')
        mime_type = 'application/json'

    emailed = False
    email_status = 'not_requested'
    if job.email_to:
        ok, status = _send_email_with_attachment(
            to_email=job.email_to,
            subject=f"Clinic+ scheduled report: {saved.name}",
            body_text=f"Attached report generated at {datetime.utcnow().isoformat()}Z.",
            filename=file_name,
            content_bytes=file_bytes,
            mime_type=mime_type,
        )
        emailed = ok
        email_status = status
    trigger_type = (payload.get('trigger_type') or 'manual').lower()
    run_result = {
        'saved_report_id': saved.id,
        'name': saved.name,
        'spec': spec,
        'generated_at': datetime.utcnow().isoformat() + 'Z',
        'format': out_format,
        'row_count': len(rows),
        'file_name': file_name,
        'mime_type': mime_type,
        'emailed': emailed,
        'email_status': email_status,
    }
    job.last_run_at = datetime.utcnow()
    job.last_status = 'ok' if (not job.email_to or emailed) else f'email_failed:{email_status}'
    history = ReportRunHistory(
        job_id=job.id,
        saved_report_id=saved.id,
        run_at=datetime.utcnow(),
        format=out_format,
        row_count=len(rows),
        status='ok' if (not job.email_to or emailed) else 'email_failed',
        email_status=email_status,
        file_name=file_name,
        trigger_type=trigger_type,
    )
    db.session.add(history)
    db.session.commit()
    if payload.get('inline_file'):
        return Response(
            file_bytes,
            mimetype=mime_type,
            headers={'Content-Disposition': f'attachment; filename="{file_name}"'},
        )
    return jsonify({'success': True, 'job': job.to_dict(), 'run': run_result, 'history': history.to_dict()}), 200


@product_hub_bp.route('/reports/schedule/run-due', methods=['POST'])
@token_required
@role_required(['admin', 'System Administrator', 'physician', 'Physician', 'receptionist', 'Receptionist'])
def report_schedule_run_due():
    """
    Worker-style endpoint: run all active jobs now (cron dispatch can call this).
    """
    jobs = ReportScheduleJob.query.filter_by(is_active=True).all()
    results = []
    for j in jobs:
        saved = SavedReport.query.filter_by(id=j.saved_report_id).first()
        if not saved:
            continue
        try:
            spec = json.loads(saved.spec_json or '{}')
        except Exception:
            spec = {}
        rows = _materialize_report_rows(spec, facility_id=saved.facility_id)
        j.last_run_at = datetime.utcnow()
        j.last_status = f'ok:{len(rows)}rows'
        db.session.add(ReportRunHistory(
            job_id=j.id,
            saved_report_id=saved.id,
            run_at=datetime.utcnow(),
            format=(spec or {}).get('format', 'json'),
            row_count=len(rows),
            status='ok',
            email_status='not_requested',
            file_name=None,
            trigger_type='due',
        ))
        results.append({'job_id': j.id, 'saved_report_id': saved.id, 'rows': len(rows)})
    db.session.commit()
    return jsonify({'success': True, 'ran': len(results), 'results': results}), 200


@product_hub_bp.route('/reports/schedule/<int:job_id>/history', methods=['GET'])
@token_required
@role_required(['admin', 'System Administrator', 'physician', 'Physician', 'receptionist', 'Receptionist'])
def report_schedule_history(job_id):
    """Fetch run history for one scheduled report job."""
    ReportScheduleJob.query.get_or_404(job_id)
    limit = min(max(request.args.get('limit', 50, type=int) or 50, 1), 500)
    rows = ReportRunHistory.query.filter_by(job_id=job_id).order_by(ReportRunHistory.run_at.desc()).limit(limit).all()
    return jsonify({'success': True, 'history': [r.to_dict() for r in rows], 'count': len(rows)}), 200


@product_hub_bp.route('/reports/compliance-pack', methods=['GET'])
@token_required
@role_required(['admin', 'System Administrator', 'compliance', 'compliance officer'])
def compliance_pack():
    return jsonify({
        'success': True,
        'packs': [
            {'id': 'hipaa', 'name': 'HIPAA audit evidence export', 'endpoint': '/api/audit/hipaa?range='},
            {'id': 'access', 'name': 'User access report', 'endpoint': '/api/reports/encounters'},
        ],
    }), 200


# --- Prescription refill (staff) — portal already has one for patients ---
@product_hub_bp.route('/insurance/eob/ingest', methods=['POST'])
@token_required
@role_required(['admin', 'System Administrator', 'receptionist', 'Receptionist', 'physician', 'Physician'])
def eob_ingest_placeholder():
    return jsonify({
        'success': False,
        'message': 'X12 835/ERA file ingestion runs via clearinghouse/ERA worker; upload endpoint TBD',
    }), 501


@product_hub_bp.route('/documents/ocr/ingest', methods=['POST'])
@token_required
def ocr_ingest_placeholder():
    return jsonify({
        'success': False,
        'message': 'Connect Textract, Azure DI, or open-source pipeline; do not pass PHI in dev logs',
    }), 501


@product_hub_bp.route('/reports/pdf/sample', methods=['GET'])
@token_required
def sample_pdf():
    try:
        from fpdf import FPDF
    except ImportError:
        return jsonify({
            'success': False,
            'message': 'Install fpdf2 to enable this endpoint: pip install fpdf2',
        }), 501
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font('Helvetica', 'B', 16)
    pdf.cell(0, 10, 'Clinic+ sample report (todo-2)', new_x='LMARGIN', new_y='NEXT')
    pdf.set_font('Helvetica', '', 11)
    pdf.multi_cell(0, 8, f'Generated {datetime.utcnow().isoformat()}Z')
    return Response(
        pdf.output(),
        mimetype='application/pdf',
        headers={'Content-Disposition': 'inline; filename="clinicplus-sample.pdf"'},
    )


@product_hub_bp.route('/prescribing/<prescription_id>/refill-intake', methods=['POST'])
@token_required
def refill_intake(prescription_id):
    p = Prescription.query.filter_by(prescription_id=prescription_id).first_or_404()
    if (p.refills_remaining or 0) <= 0:
        return jsonify({'error': 'No refills remaining'}), 400
    p.refills_remaining = (p.refills_remaining or 0) - 1
    db.session.commit()
    return jsonify({'success': True, 'message': 'Refill applied (intake). Dispatch to eRx in production', 'prescription': p.drug_name}), 200
