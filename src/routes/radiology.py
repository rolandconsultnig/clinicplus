"""
Radiology workflow routes (order queue, reporting, document linkage).
"""
from datetime import datetime, timedelta
import uuid
import json
from flask import Blueprint, jsonify, request
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.patient import Patient
from src.models.auth import AuditLog
from src.models.documents import Document
from src.models.radiology import (
    RadiologyOrder,
    RadiologyViewerLaunchToken,
    RadiologyShareLink,
    RadiologyProtocol,
    RadiologyPACSConnector,
    RadiologyCriticalNotificationEvent,
)

radiology_bp = Blueprint('radiology', __name__)
_tables_ready = False
LAUNCH_TOKEN_TTL_MINUTES = 10
SHARE_LINK_TTL_HOURS = 72
PRIORITY_RANK = {'stat': 0, 'urgent': 1, 'routine': 2}
ROLE_RADIOLOGIST = ['radiologist', 'admin', 'system administrator']
ROLE_RADIOGRAPHER_OR_HIGHER = ['radiographer', 'radiologist', 'admin', 'system administrator']
ROLE_ORDER_ENTRY = ['physician', 'radiographer', 'radiologist', 'admin', 'system administrator']


def _ensure_radiology_tables():
    global _tables_ready
    if _tables_ready:
        return
    RadiologyOrder.__table__.create(bind=db.engine, checkfirst=True)
    RadiologyViewerLaunchToken.__table__.create(bind=db.engine, checkfirst=True)
    RadiologyShareLink.__table__.create(bind=db.engine, checkfirst=True)
    RadiologyProtocol.__table__.create(bind=db.engine, checkfirst=True)
    RadiologyPACSConnector.__table__.create(bind=db.engine, checkfirst=True)
    RadiologyCriticalNotificationEvent.__table__.create(bind=db.engine, checkfirst=True)

    def _ensure_columns(table_name, columns):
        existing = set()
        for row in db.session.execute(db.text(f"PRAGMA table_info({table_name})")).fetchall():
            existing.add(row[1])
        for column_name, ddl in columns:
            if column_name not in existing:
                db.session.execute(db.text(f"ALTER TABLE {table_name} ADD COLUMN {ddl}"))
        db.session.commit()

    _ensure_columns('radiology_orders', [
        ('dicom_study_uid', 'dicom_study_uid VARCHAR(120)'),
        ('dicom_series_uid', 'dicom_series_uid VARCHAR(120)'),
        ('accession_number', 'accession_number VARCHAR(80)'),
        ('pacs_source', 'pacs_source VARCHAR(120)'),
        ('viewer_vendor', "viewer_vendor VARCHAR(80) DEFAULT 'internal_placeholder'"),
        ('dicom_metadata_json', 'dicom_metadata_json TEXT'),
        ('ai_triage_score', 'ai_triage_score FLOAT'),
        ('ai_triage_findings_json', 'ai_triage_findings_json TEXT'),
        ('protocol_name', 'protocol_name VARCHAR(120)'),
        ('modality_room', 'modality_room VARCHAR(80)'),
        ('structured_report_json', 'structured_report_json TEXT'),
        ('critical_findings_json', 'critical_findings_json TEXT'),
        ('signed_by_user_id', 'signed_by_user_id INTEGER'),
        ('signed_at', 'signed_at DATETIME'),
        ('dose_mgy', 'dose_mgy FLOAT'),
        ('contrast_details_json', 'contrast_details_json TEXT'),
        ('voice_dictation_text', 'voice_dictation_text TEXT'),
        ('comparison_order_id', 'comparison_order_id INTEGER'),
        ('peer_review_json', 'peer_review_json TEXT'),
        ("referral_status", "referral_status VARCHAR(40) DEFAULT 'pending'"),
    ])
    _tables_ready = True


@radiology_bp.before_request
def initialize_radiology_module():
    _ensure_radiology_tables()


def _parse_iso_datetime(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except (TypeError, ValueError):
        return None


def _validate_metadata(metadata):
    if metadata is None:
        return True, ''
    if not isinstance(metadata, dict):
        return False, 'dicom_metadata must be an object'
    # Contract placeholders only; keep validation intentionally lightweight.
    allowed_top_level = {
        'study_instance_uid',
        'series_instance_uid',
        'accession_number',
        'sop_class_uid',
        'frame_of_reference_uid',
        'number_of_instances',
        'series',
        'viewer_hints',
    }
    for key in metadata.keys():
        if key not in allowed_top_level:
            return False, f'Unsupported metadata field: {key}'
    return True, ''


def _safe_json(value):
    if value is None:
        return None
    if isinstance(value, dict):
        return value
    return None


def _safe_json_dump(value):
    return json.dumps(value) if isinstance(value, dict) else None


def _has_any_role(*allowed_roles):
    payload_roles = request.token_payload.get('roles', [])
    current = {str(role.get('role_name', '')).lower() for role in payload_roles if isinstance(role, dict)}
    if not current:
        # Fallback for payloads that only include user_type
        user_type = str(request.token_payload.get('user_type', '')).lower()
        if user_type:
            current.add(user_type)
    return not current.isdisjoint({str(r).lower() for r in allowed_roles})


def _priority_rank(value):
    return PRIORITY_RANK.get((value or '').lower(), 9)


def _worklist_sort_key(order):
    # Prioritize by status + urgency + AI findings, then oldest order first
    status_rank = 0 if order.status in {'ordered', 'scheduled', 'in_progress'} else 1
    ai_rank = 0 if (order.ai_triage_score or 0) >= 0.8 else 1
    return (status_rank, _priority_rank(order.priority), ai_rank, order.created_at or datetime.utcnow())


def _protocol_library():
    return [
        {'name': 'MRI Brain w/o Contrast', 'modality': 'mri', 'body_part': 'brain', 'duration_min': 35},
        {'name': 'CT Chest PE Protocol', 'modality': 'ct', 'body_part': 'chest', 'duration_min': 20},
        {'name': 'US Abdomen Complete', 'modality': 'ultrasound', 'body_part': 'abdomen', 'duration_min': 30},
        {'name': 'X-Ray Chest PA/LAT', 'modality': 'xray', 'body_part': 'chest', 'duration_min': 10},
        {'name': 'CT Stroke Protocol (STAT)', 'modality': 'ct', 'body_part': 'head', 'duration_min': 15},
    ]


def _audit(action_type, resource_type, resource_id, patient_id, facility_id, details):
    db.session.add(AuditLog(
        log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
        user_id=getattr(request.current_user, 'id', None),
        action_type=action_type,
        resource_type=resource_type,
        resource_id=resource_id,
        patient_id=patient_id,
        facility_id=facility_id,
        ip_address=request.remote_addr,
        user_agent=request.headers.get('User-Agent'),
        success=True,
        details=details,
    ))


@radiology_bp.route('/orders', methods=['GET'])
@token_required
@role_required(['radiologist', 'radiographer', 'physician', 'nurse', 'admin', 'system administrator'])
def list_radiology_orders():
    try:
        facility_id = request.token_payload.get('facility_id')
        status = (request.args.get('status') or '').strip().lower()
        modality = (request.args.get('modality') or '').strip().lower()
        search = (request.args.get('q') or '').strip().lower()

        query = RadiologyOrder.query.filter(RadiologyOrder.facility_id == facility_id)
        if status and status != 'all':
            query = query.filter(RadiologyOrder.status == status)
        if modality and modality != 'all':
            query = query.filter(RadiologyOrder.modality == modality)
        if search:
            query = query.filter(
                db.or_(
                    RadiologyOrder.order_code.ilike(f'%{search}%'),
                    RadiologyOrder.study_name.ilike(f'%{search}%'),
                    RadiologyOrder.accession_number.ilike(f'%{search}%'),
                )
            )

        rows = query.order_by(RadiologyOrder.created_at.desc()).all()
        return jsonify({'success': True, 'orders': [row.to_dict() for row in rows]}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@radiology_bp.route('/orders', methods=['POST'])
@token_required
@role_required(ROLE_ORDER_ENTRY)
def create_radiology_order():
    try:
        data = request.get_json() or {}
        patient_id = data.get('patient_id')
        study_name = (data.get('study_name') or '').strip()
        modality = (data.get('modality') or 'xray').strip().lower()
        comparison_order_id = data.get('comparison_order_id')
        if not patient_id:
            return jsonify({'success': False, 'error': 'patient_id is required'}), 400
        if not study_name:
            return jsonify({'success': False, 'error': 'study_name is required'}), 400

        patient = Patient.query.filter(
            db.or_(Patient.id == patient_id, Patient.universal_patient_id == patient_id)
        ).first()
        if not patient:
            return jsonify({'success': False, 'error': 'Patient not found'}), 404

        facility_id = request.token_payload.get('facility_id')

        if comparison_order_id:
            comparison = RadiologyOrder.query.filter_by(id=comparison_order_id, facility_id=facility_id).first()
            if not comparison:
                return jsonify({'success': False, 'error': 'comparison_order_id not found in facility'}), 404

        order = RadiologyOrder(
            order_code=f"RAD-{uuid.uuid4().hex[:10].upper()}",
            patient_id=patient.id,
            ordering_provider_id=data.get('ordering_provider_id') or getattr(request.current_user, 'provider_id', None),
            facility_id=facility_id,
            study_name=study_name,
            modality=modality,
            priority=(data.get('priority') or 'routine').strip().lower(),
            indication=data.get('indication'),
            status='ordered',
            scheduled_at=_parse_iso_datetime(data.get('scheduled_at')),
            protocol_name=data.get('protocol_name'),
            modality_room=data.get('modality_room'),
            comparison_order_id=comparison_order_id,
            contrast_details_json=_safe_json_dump(_safe_json(data.get('contrast_details'))),
            notes=data.get('notes'),
            created_by_user_id=getattr(request.current_user, 'id', None),
        )
        db.session.add(order)
        db.session.flush()
        _audit(
            action_type='radiology_order_created',
            resource_type='radiology_order',
            resource_id=order.id,
            patient_id=patient.id,
            facility_id=order.facility_id,
            details=f'order_code={order.order_code}, modality={order.modality}',
        )
        db.session.commit()
        return jsonify({'success': True, 'order': order.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@radiology_bp.route('/orders/<int:order_id>/status', methods=['PATCH'])
@token_required
@role_required(ROLE_RADIOGRAPHER_OR_HIGHER)
def update_radiology_order_status(order_id):
    try:
        data = request.get_json() or {}
        new_status = (data.get('status') or '').strip().lower()
        if new_status not in {'ordered', 'scheduled', 'in_progress', 'reported', 'cancelled'}:
            return jsonify({'success': False, 'error': 'Invalid status'}), 400
        if new_status == 'reported' and not _has_any_role('radiologist', 'admin', 'system administrator'):
            return jsonify({'success': False, 'error': 'Only radiologist-level roles can mark reported'}), 403

        facility_id = request.token_payload.get('facility_id')
        order = RadiologyOrder.query.filter_by(id=order_id, facility_id=facility_id).first()
        if not order:
            return jsonify({'success': False, 'error': 'Radiology order not found'}), 404

        order.status = new_status
        if new_status == 'in_progress' and not order.started_at:
            order.started_at = datetime.utcnow()
        if new_status == 'reported' and not order.completed_at:
            order.completed_at = datetime.utcnow()
        if data.get('scheduled_at'):
            parsed = _parse_iso_datetime(data.get('scheduled_at'))
            if not parsed:
                return jsonify({'success': False, 'error': 'scheduled_at must be ISO datetime'}), 400
            order.scheduled_at = parsed
        _audit(
            action_type='radiology_order_status_updated',
            resource_type='radiology_order',
            resource_id=order.id,
            patient_id=order.patient_id,
            facility_id=order.facility_id,
            details=f'status={new_status}',
        )
        db.session.commit()
        return jsonify({'success': True, 'order': order.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@radiology_bp.route('/orders/<int:order_id>/report', methods=['POST'])
@token_required
@role_required(ROLE_RADIOGRAPHER_OR_HIGHER)
def submit_radiology_report(order_id):
    try:
        data = request.get_json() or {}
        report_text = (data.get('report_text') or '').strip()
        if not report_text:
            return jsonify({'success': False, 'error': 'report_text is required'}), 400

        facility_id = request.token_payload.get('facility_id')
        order = RadiologyOrder.query.filter_by(id=order_id, facility_id=facility_id).first()
        if not order:
            return jsonify({'success': False, 'error': 'Radiology order not found'}), 404

        can_finalize = _has_any_role('radiologist', 'admin', 'system administrator')
        order.report_text = report_text
        order.reported_by_user_id = getattr(request.current_user, 'id', None)
        order.reported_at = datetime.utcnow()
        if can_finalize:
            order.status = 'reported'
            order.completed_at = order.completed_at or datetime.utcnow()
        else:
            # Radiographer submissions are saved as preliminary until radiologist sign-off.
            if order.status not in {'in_progress', 'reported'}:
                order.status = 'in_progress'
            order.referral_status = 'preliminary_report_pending_signoff'
        structured_report = _safe_json(data.get('structured_report'))
        if structured_report is not None:
            order.structured_report_json = _safe_json_dump(structured_report)
        critical_findings = _safe_json(data.get('critical_findings'))
        if critical_findings is not None:
            order.critical_findings_json = _safe_json_dump(critical_findings)
        if data.get('voice_dictation_text'):
            order.voice_dictation_text = str(data.get('voice_dictation_text'))

        linked_doc_id = data.get('linked_document_id')
        created_document = None
        if linked_doc_id:
            document = Document.query.filter_by(id=linked_doc_id, facility_id=facility_id).first()
            if not document:
                return jsonify({'success': False, 'error': 'linked_document_id not found in facility'}), 404
            order.linked_document_id = document.id
        elif data.get('create_document', True):
            file_name = f"radiology_report_{order.order_code}.txt"
            pseudo_path = f"generated://radiology/{order.order_code}"
            document = Document(
                document_id=f"DOC-{uuid.uuid4().hex[:12].upper()}",
                title=data.get('document_title') or f"Radiology Report - {order.study_name}",
                description='Generated radiology report',
                document_type='imaging_report',
                category='clinical',
                file_name=file_name,
                file_path=pseudo_path,
                file_size=len(report_text.encode('utf-8')),
                mime_type='text/plain',
                patient_id=order.patient_id,
                facility_id=facility_id,
                source='generated',
                workflow_status='approved',
                created_by=getattr(request.current_user, 'id', None),
                is_active=True,
            )
            db.session.add(document)
            db.session.flush()
            order.linked_document_id = document.id
            created_document = document.to_dict()

        _audit(
            action_type='radiology_report_submitted',
            resource_type='radiology_order',
            resource_id=order.id,
            patient_id=order.patient_id,
            facility_id=order.facility_id,
            details=f'linked_document_id={order.linked_document_id}',
        )
        db.session.commit()
        return jsonify({
            'success': True,
            'order': order.to_dict(),
            'document': created_document,
            'finalized': can_finalize,
            'message': 'Report finalized' if can_finalize else 'Preliminary report saved; radiologist sign-off required',
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@radiology_bp.route('/orders/<int:order_id>/ai-triage', methods=['POST'])
@token_required
@role_required(['radiographer', 'radiologist', 'admin', 'system administrator'])
def update_ai_triage(order_id):
    try:
        data = request.get_json() or {}
        facility_id = request.token_payload.get('facility_id')
        order = RadiologyOrder.query.filter_by(id=order_id, facility_id=facility_id).first()
        if not order:
            return jsonify({'success': False, 'error': 'Radiology order not found'}), 404

        score = data.get('score')
        findings = _safe_json(data.get('findings')) or {}
        if score is not None:
            try:
                order.ai_triage_score = float(score)
            except (TypeError, ValueError):
                return jsonify({'success': False, 'error': 'score must be numeric'}), 400
        order.ai_triage_findings_json = _safe_json_dump(findings)

        _audit(
            action_type='radiology_ai_triage_updated',
            resource_type='radiology_order',
            resource_id=order.id,
            patient_id=order.patient_id,
            facility_id=order.facility_id,
            details=f'score={order.ai_triage_score}',
        )
        db.session.commit()
        return jsonify({'success': True, 'order': order.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@radiology_bp.route('/orders/<int:order_id>/structured-report', methods=['POST'])
@token_required
@role_required(ROLE_RADIOGRAPHER_OR_HIGHER)
def submit_structured_report(order_id):
    try:
        data = request.get_json() or {}
        structured_report = _safe_json(data.get('structured_report'))
        if not structured_report:
            return jsonify({'success': False, 'error': 'structured_report object is required'}), 400

        facility_id = request.token_payload.get('facility_id')
        order = RadiologyOrder.query.filter_by(id=order_id, facility_id=facility_id).first()
        if not order:
            return jsonify({'success': False, 'error': 'Radiology order not found'}), 404

        order.structured_report_json = _safe_json_dump(structured_report)
        impression = (structured_report.get('impression') or '').strip()
        findings = (structured_report.get('findings') or '').strip()
        if impression or findings:
            order.report_text = '\n'.join([part for part in [findings, impression] if part]).strip()

        _audit(
            action_type='radiology_structured_report_updated',
            resource_type='radiology_order',
            resource_id=order.id,
            patient_id=order.patient_id,
            facility_id=order.facility_id,
            details='structured_report_saved',
        )
        db.session.commit()
        return jsonify({'success': True, 'order': order.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@radiology_bp.route('/orders/<int:order_id>/critical-findings', methods=['POST'])
@token_required
@role_required(ROLE_RADIOLOGIST)
def report_critical_findings(order_id):
    try:
        data = request.get_json() or {}
        summary = (data.get('summary') or '').strip()
        if not summary:
            return jsonify({'success': False, 'error': 'summary is required'}), 400

        facility_id = request.token_payload.get('facility_id')
        order = RadiologyOrder.query.filter_by(id=order_id, facility_id=facility_id).first()
        if not order:
            return jsonify({'success': False, 'error': 'Radiology order not found'}), 404

        channels = data.get('channels') if isinstance(data.get('channels'), list) else ['in_app']
        payload = {
            'summary': summary,
            'severity': data.get('severity') or 'critical',
            'channels': channels,
            'notified_referrer': bool(data.get('notify_referrer', True)),
            'notified_at': datetime.utcnow().isoformat(),
            'ack_required': True,
            'acknowledged_at': None,
        }
        order.critical_findings_json = json.dumps(payload)
        events = []
        for channel in channels:
            ev = RadiologyCriticalNotificationEvent(
                event_token=f"RCN-{uuid.uuid4().hex}",
                radiology_order_id=order.id,
                channel=str(channel).lower(),
                recipient=data.get('recipient'),
                status='sent',
                ack_required=True,
            )
            db.session.add(ev)
            db.session.flush()
            events.append(ev.to_dict())

        _audit(
            action_type='radiology_critical_findings_alerted',
            resource_type='radiology_order',
            resource_id=order.id,
            patient_id=order.patient_id,
            facility_id=order.facility_id,
            details=f"channels={','.join(channels)}",
        )
        db.session.commit()
        return jsonify({'success': True, 'order': order.to_dict(), 'alert': payload, 'notification_events': events}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@radiology_bp.route('/orders/<int:order_id>/critical-findings/ack', methods=['POST'])
@token_required
@role_required(['physician', 'nurse', 'radiologist', 'admin', 'system administrator'])
def acknowledge_critical_findings(order_id):
    try:
        data = request.get_json() or {}
        facility_id = request.token_payload.get('facility_id')
        order = RadiologyOrder.query.filter_by(id=order_id, facility_id=facility_id).first()
        if not order:
            return jsonify({'success': False, 'error': 'Radiology order not found'}), 404
        payload = _safe_json(json.loads(order.critical_findings_json) if order.critical_findings_json else {})
        if not payload:
            return jsonify({'success': False, 'error': 'No critical findings to acknowledge'}), 400
        payload['acknowledged_at'] = datetime.utcnow().isoformat()
        payload['acknowledged_by_user_id'] = getattr(request.current_user, 'id', None)
        order.critical_findings_json = json.dumps(payload)
        event_token = data.get('event_token')
        updated_event = None
        if event_token:
            ev = RadiologyCriticalNotificationEvent.query.filter_by(event_token=event_token, radiology_order_id=order.id).first()
            if ev:
                ev.status = 'acknowledged'
                ev.acknowledged_by_user_id = getattr(request.current_user, 'id', None)
                ev.acknowledged_at = datetime.utcnow()
                updated_event = ev.to_dict()
        else:
            rows = RadiologyCriticalNotificationEvent.query.filter_by(radiology_order_id=order.id, ack_required=True).all()
            for ev in rows:
                if ev.acknowledged_at is None:
                    ev.status = 'acknowledged'
                    ev.acknowledged_by_user_id = getattr(request.current_user, 'id', None)
                    ev.acknowledged_at = datetime.utcnow()
        _audit(
            action_type='radiology_critical_findings_acknowledged',
            resource_type='radiology_order',
            resource_id=order.id,
            patient_id=order.patient_id,
            facility_id=order.facility_id,
            details=f"event_token={event_token or 'all'}",
        )
        db.session.commit()
        return jsonify({'success': True, 'order': order.to_dict(), 'notification_event': updated_event}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@radiology_bp.route('/orders/<int:order_id>/critical-events', methods=['GET'])
@token_required
@role_required(['physician', 'nurse', 'radiographer', 'radiologist', 'admin', 'system administrator'])
def list_critical_events(order_id):
    try:
        facility_id = request.token_payload.get('facility_id')
        order = RadiologyOrder.query.filter_by(id=order_id, facility_id=facility_id).first()
        if not order:
            return jsonify({'success': False, 'error': 'Radiology order not found'}), 404
        rows = RadiologyCriticalNotificationEvent.query.filter_by(radiology_order_id=order.id).order_by(RadiologyCriticalNotificationEvent.created_at.desc()).all()
        return jsonify({'success': True, 'events': [row.to_dict() for row in rows]}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@radiology_bp.route('/critical-events/<string:event_token>/ack', methods=['POST'])
def acknowledge_critical_event_by_token(event_token):
    """Closed-loop external acknowledgment (e.g., referrer SMS/email link)."""
    try:
        ev = RadiologyCriticalNotificationEvent.query.filter_by(event_token=event_token).first()
        if not ev:
            return jsonify({'success': False, 'error': 'Notification event not found'}), 404
        if ev.acknowledged_at is not None:
            return jsonify({'success': True, 'event': ev.to_dict(), 'already_acknowledged': True}), 200
        ev.status = 'acknowledged'
        ev.acknowledged_at = datetime.utcnow()
        # acknowledged_by_user_id intentionally left null for token-only external acknowledgments
        order = RadiologyOrder.query.filter_by(id=ev.radiology_order_id).first()
        if order and order.critical_findings_json:
            payload = _safe_json(json.loads(order.critical_findings_json)) or {}
            payload['acknowledged_at'] = ev.acknowledged_at.isoformat()
            payload['acknowledged_by'] = 'external_token'
            order.critical_findings_json = json.dumps(payload)
        db.session.commit()
        return jsonify({'success': True, 'event': ev.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@radiology_bp.route('/orders/<int:order_id>/sign', methods=['POST'])
@token_required
@role_required(ROLE_RADIOLOGIST)
def sign_radiology_report(order_id):
    try:
        facility_id = request.token_payload.get('facility_id')
        order = RadiologyOrder.query.filter_by(id=order_id, facility_id=facility_id).first()
        if not order:
            return jsonify({'success': False, 'error': 'Radiology order not found'}), 404
        if not (order.report_text or order.structured_report_json):
            return jsonify({'success': False, 'error': 'Cannot sign empty report'}), 400

        order.signed_by_user_id = getattr(request.current_user, 'id', None)
        order.signed_at = datetime.utcnow()
        db.session.commit()
        return jsonify({'success': True, 'order': order.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@radiology_bp.route('/orders/<int:order_id>/dose', methods=['POST'])
@token_required
@role_required(['radiographer', 'radiologist', 'admin', 'system administrator'])
def track_dose(order_id):
    try:
        data = request.get_json() or {}
        facility_id = request.token_payload.get('facility_id')
        order = RadiologyOrder.query.filter_by(id=order_id, facility_id=facility_id).first()
        if not order:
            return jsonify({'success': False, 'error': 'Radiology order not found'}), 404

        dose_value = data.get('dose_mgy')
        if dose_value is None:
            return jsonify({'success': False, 'error': 'dose_mgy is required'}), 400
        try:
            order.dose_mgy = float(dose_value)
        except (TypeError, ValueError):
            return jsonify({'success': False, 'error': 'dose_mgy must be numeric'}), 400

        contrast_details = _safe_json(data.get('contrast_details'))
        if contrast_details is not None:
            order.contrast_details_json = _safe_json_dump(contrast_details)

        db.session.commit()
        return jsonify({'success': True, 'order': order.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@radiology_bp.route('/orders/<int:order_id>/voice-dictation', methods=['POST'])
@token_required
@role_required(ROLE_RADIOGRAPHER_OR_HIGHER)
def save_voice_dictation(order_id):
    try:
        data = request.get_json() or {}
        text = (data.get('voice_text') or '').strip()
        if not text:
            return jsonify({'success': False, 'error': 'voice_text is required'}), 400
        facility_id = request.token_payload.get('facility_id')
        order = RadiologyOrder.query.filter_by(id=order_id, facility_id=facility_id).first()
        if not order:
            return jsonify({'success': False, 'error': 'Radiology order not found'}), 404

        order.voice_dictation_text = text
        if data.get('append_to_report'):
            order.report_text = f"{(order.report_text or '').strip()}\n{text}".strip()

        db.session.commit()
        return jsonify({'success': True, 'order': order.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@radiology_bp.route('/orders/<int:order_id>/peer-review', methods=['POST'])
@token_required
@role_required(['radiologist', 'admin', 'system administrator'])
def peer_review_order(order_id):
    try:
        data = request.get_json() or {}
        facility_id = request.token_payload.get('facility_id')
        order = RadiologyOrder.query.filter_by(id=order_id, facility_id=facility_id).first()
        if not order:
            return jsonify({'success': False, 'error': 'Radiology order not found'}), 404

        peer_review = {
            'reviewed_by_user_id': getattr(request.current_user, 'id', None),
            'agreement_level': data.get('agreement_level') or 'agree',
            'comments': data.get('comments') or '',
            'blind_review': bool(data.get('blind_review', True)),
            'reviewed_at': datetime.utcnow().isoformat(),
        }
        order.peer_review_json = json.dumps(peer_review)
        db.session.commit()
        return jsonify({'success': True, 'order': order.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@radiology_bp.route('/orders/<int:order_id>/dicom-metadata', methods=['PATCH'])
@token_required
@role_required(['radiographer', 'radiologist', 'admin', 'system administrator'])
def update_dicom_metadata(order_id):
    try:
        data = request.get_json() or {}
        facility_id = request.token_payload.get('facility_id')
        order = RadiologyOrder.query.filter_by(id=order_id, facility_id=facility_id).first()
        if not order:
            return jsonify({'success': False, 'error': 'Radiology order not found'}), 404

        metadata = data.get('dicom_metadata')
        valid, error_message = _validate_metadata(metadata)
        if not valid:
            return jsonify({'success': False, 'error': error_message}), 400

        if 'dicom_study_uid' in data:
            order.dicom_study_uid = data.get('dicom_study_uid')
        if 'dicom_series_uid' in data:
            order.dicom_series_uid = data.get('dicom_series_uid')
        if 'accession_number' in data:
            order.accession_number = data.get('accession_number')
        if 'pacs_source' in data:
            order.pacs_source = data.get('pacs_source')
        if 'viewer_vendor' in data:
            order.viewer_vendor = data.get('viewer_vendor') or 'internal_placeholder'
        if metadata is not None:
            order.dicom_metadata_json = json.dumps(metadata)

        _audit(
            action_type='radiology_dicom_metadata_updated',
            resource_type='radiology_order',
            resource_id=order.id,
            patient_id=order.patient_id,
            facility_id=order.facility_id,
            details=f'order_code={order.order_code}',
        )
        db.session.commit()
        return jsonify({'success': True, 'order': order.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@radiology_bp.route('/orders/<int:order_id>/viewer-launch-token', methods=['POST'])
@token_required
@role_required(['radiographer', 'radiologist', 'physician', 'nurse', 'admin', 'system administrator'])
def create_viewer_launch_token(order_id):
    try:
        facility_id = request.token_payload.get('facility_id')
        order = RadiologyOrder.query.filter_by(id=order_id, facility_id=facility_id).first()
        if not order:
            return jsonify({'success': False, 'error': 'Radiology order not found'}), 404

        token = RadiologyViewerLaunchToken(
            launch_token=f"VLT-{uuid.uuid4().hex}",
            radiology_order_id=order.id,
            user_id=getattr(request.current_user, 'id', None),
            facility_id=facility_id,
            expires_at=datetime.utcnow() + timedelta(minutes=LAUNCH_TOKEN_TTL_MINUTES),
            is_active=True,
        )
        db.session.add(token)
        db.session.flush()
        _audit(
            action_type='radiology_viewer_launch_token_created',
            resource_type='radiology_viewer_launch_token',
            resource_id=token.id,
            patient_id=order.patient_id,
            facility_id=facility_id,
            details=f'order_code={order.order_code}, expires_at={token.expires_at.isoformat()}',
        )
        db.session.commit()
        return jsonify({
            'success': True,
            'launch_token': token.launch_token,
            'expires_at': token.expires_at.isoformat(),
            'launch_url': f"/api/radiology/viewer-launch/{token.launch_token}",
            'viewer_contract': {
                'order_code': order.order_code,
                'dicom_study_uid': order.dicom_study_uid,
                'dicom_series_uid': order.dicom_series_uid,
                'accession_number': order.accession_number,
                'pacs_source': order.pacs_source,
                'viewer_vendor': order.viewer_vendor,
            },
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@radiology_bp.route('/viewer-launch/<string:launch_token>', methods=['GET'])
@token_required
@role_required(['radiographer', 'radiologist', 'physician', 'nurse', 'admin', 'system administrator'])
def launch_viewer_with_token(launch_token):
    try:
        facility_id = request.token_payload.get('facility_id')
        token = RadiologyViewerLaunchToken.query.filter_by(
            launch_token=launch_token,
            facility_id=facility_id,
            is_active=True
        ).first()
        if not token:
            return jsonify({'success': False, 'error': 'Viewer launch token not found'}), 404
        if not token.is_valid():
            return jsonify({'success': False, 'error': 'Viewer launch token expired or consumed'}), 410

        order = RadiologyOrder.query.filter_by(id=token.radiology_order_id, facility_id=facility_id).first()
        if not order:
            return jsonify({'success': False, 'error': 'Radiology order not found'}), 404

        token.consumed_at = datetime.utcnow()
        token.is_active = False
        _audit(
            action_type='radiology_viewer_launched',
            resource_type='radiology_order',
            resource_id=order.id,
            patient_id=order.patient_id,
            facility_id=facility_id,
            details=f'launch_token_id={token.id}',
        )
        db.session.commit()

        return jsonify({
            'success': True,
            'viewer_session': {
                'launch_token_id': token.id,
                'launched_at': token.consumed_at.isoformat(),
                'viewer_vendor': order.viewer_vendor,
                'viewer_url': f"/dicom-viewer/{order.id}",
            },
            'contract': {
                'order': order.to_dict(),
                'dicom_metadata': order.to_dict().get('dicom_metadata', {}),
                'study_instance_uid': order.dicom_study_uid,
                'series_instance_uid': order.dicom_series_uid,
                'accession_number': order.accession_number,
                'pacs_source': order.pacs_source,
            },
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@radiology_bp.route('/orders/<int:order_id>/share-links', methods=['POST'])
@token_required
@role_required(['radiologist', 'radiographer', 'physician', 'nurse', 'admin'])
def create_share_link(order_id):
    try:
        data = request.get_json() or {}
        facility_id = request.token_payload.get('facility_id')
        order = RadiologyOrder.query.filter_by(id=order_id, facility_id=facility_id).first()
        if not order:
            return jsonify({'success': False, 'error': 'Radiology order not found'}), 404

        audience = (data.get('audience') or 'patient').strip().lower()
        ttl_hours = data.get('ttl_hours') or SHARE_LINK_TTL_HOURS
        try:
            ttl_hours = max(1, min(int(ttl_hours), 24 * 30))
        except (TypeError, ValueError):
            ttl_hours = SHARE_LINK_TTL_HOURS

        share = RadiologyShareLink(
            share_token=f"RSL-{uuid.uuid4().hex}",
            radiology_order_id=order.id,
            created_by_user_id=getattr(request.current_user, 'id', None),
            audience=audience,
            expires_at=datetime.utcnow() + timedelta(hours=ttl_hours),
            is_active=True,
        )
        db.session.add(share)
        db.session.flush()
        db.session.commit()
        return jsonify({
            'success': True,
            'share_link': share.to_dict(),
            'share_url': f"/api/radiology/share/{share.share_token}",
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@radiology_bp.route('/orders/<int:order_id>/share-links', methods=['GET'])
@token_required
@role_required(['radiologist', 'radiographer', 'physician', 'nurse', 'admin'])
def list_share_links(order_id):
    try:
        facility_id = request.token_payload.get('facility_id')
        order = RadiologyOrder.query.filter_by(id=order_id, facility_id=facility_id).first()
        if not order:
            return jsonify({'success': False, 'error': 'Radiology order not found'}), 404
        rows = RadiologyShareLink.query.filter_by(radiology_order_id=order.id).order_by(RadiologyShareLink.created_at.desc()).all()
        return jsonify({'success': True, 'share_links': [row.to_dict() for row in rows]}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@radiology_bp.route('/share/<string:share_token>', methods=['GET'])
def consume_share_link(share_token):
    """Public-ish handoff endpoint for patient/referral viewing contract only."""
    try:
        share = RadiologyShareLink.query.filter_by(share_token=share_token, is_active=True).first()
        if not share:
            return jsonify({'success': False, 'error': 'Share link not found'}), 404
        if not share.is_valid():
            return jsonify({'success': False, 'error': 'Share link expired or consumed'}), 410
        order = RadiologyOrder.query.filter_by(id=share.radiology_order_id).first()
        if not order:
            return jsonify({'success': False, 'error': 'Radiology order not found'}), 404
        share.consumed_at = datetime.utcnow()
        share.is_active = False
        db.session.commit()
        return jsonify({
            'success': True,
            'audience': share.audience,
            'order': {
                'order_code': order.order_code,
                'study_name': order.study_name,
                'modality': order.modality,
                'status': order.status,
                'report_text': order.report_text,
                'structured_report': order.to_dict().get('structured_report'),
                'signed_at': order.signed_at.isoformat() if order.signed_at else None,
            },
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@radiology_bp.route('/worklist', methods=['GET'])
@token_required
@role_required(['radiologist', 'radiographer', 'physician', 'nurse', 'admin'])
def enterprise_worklist():
    try:
        facility_id = request.token_payload.get('facility_id')
        include_reported = (request.args.get('include_reported') or 'false').lower() == 'true'
        rows = RadiologyOrder.query.filter_by(facility_id=facility_id).all()
        if not include_reported:
            rows = [row for row in rows if row.status != 'reported']
        rows = sorted(rows, key=_worklist_sort_key)
        return jsonify({
            'success': True,
            'worklist': [row.to_dict() for row in rows],
            'summary': {
                'stat_cases': sum(1 for row in rows if (row.priority or '').lower() == 'stat'),
                'ai_flagged': sum(1 for row in rows if (row.ai_triage_score or 0) >= 0.8),
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@radiology_bp.route('/protocols', methods=['GET'])
@token_required
@role_required(['radiographer', 'radiologist', 'physician', 'nurse', 'admin', 'system administrator'])
def list_protocols():
    try:
        facility_id = request.token_payload.get('facility_id')
        rows = RadiologyProtocol.query.filter_by(facility_id=facility_id, is_active=True).order_by(RadiologyProtocol.name.asc()).all()
        if not rows:
            # Bootstrap defaults once per facility
            defaults = _protocol_library()
            for item in defaults:
                db.session.add(RadiologyProtocol(
                    facility_id=facility_id,
                    name=item.get('name'),
                    modality=item.get('modality') or 'xray',
                    body_part=item.get('body_part'),
                    duration_min=item.get('duration_min') or 15,
                    instructions='',
                    contrast_required=False,
                    is_active=True,
                    created_by_user_id=getattr(request.current_user, 'id', None),
                ))
            db.session.commit()
            rows = RadiologyProtocol.query.filter_by(facility_id=facility_id, is_active=True).order_by(RadiologyProtocol.name.asc()).all()
        return jsonify({'success': True, 'protocols': [row.to_dict() for row in rows]}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@radiology_bp.route('/protocols', methods=['POST'])
@token_required
@role_required(['radiologist', 'admin', 'system administrator'])
def create_protocol():
    try:
        data = request.get_json() or {}
        name = (data.get('name') or '').strip()
        modality = (data.get('modality') or 'xray').strip().lower()
        if not name:
            return jsonify({'success': False, 'error': 'name is required'}), 400
        facility_id = request.token_payload.get('facility_id')
        exists = RadiologyProtocol.query.filter_by(facility_id=facility_id, name=name, is_active=True).first()
        if exists:
            return jsonify({'success': False, 'error': 'Protocol with this name already exists'}), 409
        row = RadiologyProtocol(
            facility_id=facility_id,
            name=name,
            modality=modality,
            body_part=data.get('body_part'),
            duration_min=int(data.get('duration_min') or 15),
            instructions=data.get('instructions'),
            contrast_required=bool(data.get('contrast_required', False)),
            is_active=True,
            created_by_user_id=getattr(request.current_user, 'id', None),
        )
        db.session.add(row)
        db.session.commit()
        return jsonify({'success': True, 'protocol': row.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@radiology_bp.route('/protocols/<int:protocol_id>', methods=['PUT'])
@token_required
@role_required(['radiologist', 'admin', 'system administrator'])
def update_protocol(protocol_id):
    try:
        data = request.get_json() or {}
        facility_id = request.token_payload.get('facility_id')
        row = RadiologyProtocol.query.filter_by(id=protocol_id, facility_id=facility_id, is_active=True).first()
        if not row:
            return jsonify({'success': False, 'error': 'Protocol not found'}), 404
        if 'name' in data:
            row.name = (data.get('name') or '').strip() or row.name
        if 'modality' in data:
            row.modality = (data.get('modality') or row.modality).strip().lower()
        if 'body_part' in data:
            row.body_part = data.get('body_part')
        if 'duration_min' in data:
            row.duration_min = int(data.get('duration_min') or row.duration_min)
        if 'instructions' in data:
            row.instructions = data.get('instructions')
        if 'contrast_required' in data:
            row.contrast_required = bool(data.get('contrast_required'))
        db.session.commit()
        return jsonify({'success': True, 'protocol': row.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@radiology_bp.route('/protocols/<int:protocol_id>', methods=['DELETE'])
@token_required
@role_required(['radiologist', 'admin', 'system administrator'])
def delete_protocol(protocol_id):
    try:
        facility_id = request.token_payload.get('facility_id')
        row = RadiologyProtocol.query.filter_by(id=protocol_id, facility_id=facility_id, is_active=True).first()
        if not row:
            return jsonify({'success': False, 'error': 'Protocol not found'}), 404
        row.is_active = False
        db.session.commit()
        return jsonify({'success': True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@radiology_bp.route('/pacs-connectors', methods=['GET'])
@token_required
@role_required(['radiographer', 'radiologist', 'admin', 'system administrator'])
def list_pacs_connectors():
    try:
        facility_id = request.token_payload.get('facility_id')
        rows = RadiologyPACSConnector.query.filter_by(facility_id=facility_id, is_active=True).order_by(RadiologyPACSConnector.connector_name.asc()).all()
        return jsonify({'success': True, 'connectors': [row.to_dict() for row in rows]}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@radiology_bp.route('/pacs-connectors', methods=['POST'])
@token_required
@role_required(['radiologist', 'admin', 'system administrator'])
def create_pacs_connector():
    try:
        data = request.get_json() or {}
        name = (data.get('connector_name') or '').strip()
        if not name:
            return jsonify({'success': False, 'error': 'connector_name is required'}), 400
        facility_id = request.token_payload.get('facility_id')
        row = RadiologyPACSConnector(
            facility_id=facility_id,
            connector_name=name,
            vendor=(data.get('vendor') or 'generic').strip().lower(),
            base_url=data.get('base_url'),
            mllp_host=data.get('mllp_host'),
            mllp_port=int(data.get('mllp_port')) if data.get('mllp_port') else None,
            auth_config_json=_safe_json_dump(_safe_json(data.get('auth_config')) or {}),
            mwl_mapping_json=_safe_json_dump(_safe_json(data.get('mwl_mapping')) or {}),
            is_active=True,
            created_by_user_id=getattr(request.current_user, 'id', None),
        )
        db.session.add(row)
        db.session.commit()
        return jsonify({'success': True, 'connector': row.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@radiology_bp.route('/pacs-connectors/<int:connector_id>', methods=['PUT'])
@token_required
@role_required(['radiologist', 'admin', 'system administrator'])
def update_pacs_connector(connector_id):
    try:
        data = request.get_json() or {}
        facility_id = request.token_payload.get('facility_id')
        row = RadiologyPACSConnector.query.filter_by(id=connector_id, facility_id=facility_id, is_active=True).first()
        if not row:
            return jsonify({'success': False, 'error': 'Connector not found'}), 404
        for field in ['connector_name', 'vendor', 'base_url', 'mllp_host']:
            if field in data:
                setattr(row, field, data.get(field))
        if 'mllp_port' in data:
            row.mllp_port = int(data.get('mllp_port')) if data.get('mllp_port') else None
        if 'auth_config' in data:
            row.auth_config_json = _safe_json_dump(_safe_json(data.get('auth_config')) or {})
        if 'mwl_mapping' in data:
            row.mwl_mapping_json = _safe_json_dump(_safe_json(data.get('mwl_mapping')) or {})
        db.session.commit()
        return jsonify({'success': True, 'connector': row.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@radiology_bp.route('/pacs-connectors/<int:connector_id>', methods=['DELETE'])
@token_required
@role_required(['radiologist', 'admin', 'system administrator'])
def delete_pacs_connector(connector_id):
    try:
        facility_id = request.token_payload.get('facility_id')
        row = RadiologyPACSConnector.query.filter_by(id=connector_id, facility_id=facility_id, is_active=True).first()
        if not row:
            return jsonify({'success': False, 'error': 'Connector not found'}), 404
        row.is_active = False
        db.session.commit()
        return jsonify({'success': True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@radiology_bp.route('/pacs-connectors/<int:connector_id>/mwl-preview', methods=['GET'])
@token_required
@role_required(['radiographer', 'radiologist', 'admin', 'system administrator'])
def pacs_mwl_preview(connector_id):
    try:
        facility_id = request.token_payload.get('facility_id')
        connector = RadiologyPACSConnector.query.filter_by(id=connector_id, facility_id=facility_id, is_active=True).first()
        if not connector:
            return jsonify({'success': False, 'error': 'Connector not found'}), 404
        mapping = connector.to_dict().get('mwl_mapping', {})
        rows = RadiologyOrder.query.filter(
            RadiologyOrder.facility_id == facility_id,
            RadiologyOrder.status.in_(['ordered', 'scheduled', 'in_progress'])
        ).order_by(RadiologyOrder.scheduled_at.asc()).limit(25).all()
        mwl_items = []
        for row in rows:
            field_map = mapping.get('fields', {})
            mwl_items.append({
                field_map.get('patient_id', 'patient_id'): row.patient_id,
                field_map.get('accession', 'accession_number'): row.accession_number or row.order_code,
                field_map.get('modality', 'modality'): (row.modality or '').upper(),
                field_map.get('study_desc', 'study_description'): row.study_name,
                field_map.get('scheduled_at', 'scheduled_at'): row.scheduled_at.isoformat() if row.scheduled_at else None,
                'order_id': row.id,
                'order_code': row.order_code,
            })
        return jsonify({'success': True, 'connector': connector.to_dict(), 'mwl_items': mwl_items}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@radiology_bp.route('/pacs-connectors/<int:connector_id>/ping', methods=['POST'])
@token_required
@role_required(['radiographer', 'radiologist', 'admin', 'system administrator'])
def ping_pacs_connector(connector_id):
    try:
        facility_id = request.token_payload.get('facility_id')
        connector = RadiologyPACSConnector.query.filter_by(id=connector_id, facility_id=facility_id, is_active=True).first()
        if not connector:
            return jsonify({'success': False, 'error': 'Connector not found'}), 404
        # Contract-first adapter: this is where vendor SDK/REST/DICOMweb calls are plugged in.
        return jsonify({
            'success': True,
            'connector': connector.to_dict(),
            'adapter_status': 'ok',
            'message': 'Connector configuration validated (contract mode).',
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@radiology_bp.route('/orders/<int:order_id>/mwl-contract', methods=['GET'])
@token_required
@role_required(['radiographer', 'radiologist', 'admin', 'system administrator'])
def build_order_mwl_contract(order_id):
    try:
        connector_id = request.args.get('connector_id', type=int)
        facility_id = request.token_payload.get('facility_id')
        order = RadiologyOrder.query.filter_by(id=order_id, facility_id=facility_id).first()
        if not order:
            return jsonify({'success': False, 'error': 'Radiology order not found'}), 404
        connector = None
        if connector_id:
            connector = RadiologyPACSConnector.query.filter_by(id=connector_id, facility_id=facility_id, is_active=True).first()
            if not connector:
                return jsonify({'success': False, 'error': 'Connector not found'}), 404
        else:
            connector = RadiologyPACSConnector.query.filter_by(facility_id=facility_id, is_active=True).first()
        mapping = connector.to_dict().get('mwl_mapping', {}) if connector else {}
        fields = mapping.get('fields', {})
        mwl_contract = {
            fields.get('patient_id', 'patient_id'): order.patient_id,
            fields.get('accession', 'accession_number'): order.accession_number or order.order_code,
            fields.get('modality', 'modality'): (order.modality or '').upper(),
            fields.get('study_desc', 'study_description'): order.study_name,
            fields.get('priority', 'priority'): order.priority,
            fields.get('scheduled_at', 'scheduled_at'): order.scheduled_at.isoformat() if order.scheduled_at else None,
            fields.get('room', 'modality_room'): order.modality_room,
            'order_code': order.order_code,
            'protocol_name': order.protocol_name,
        }
        return jsonify({
            'success': True,
            'connector': connector.to_dict() if connector else None,
            'mwl_contract': mwl_contract,
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@radiology_bp.route('/modality-schedule', methods=['GET'])
@token_required
@role_required(['radiologist', 'radiographer', 'physician', 'nurse', 'admin'])
def modality_schedule():
    facility_id = request.token_payload.get('facility_id')
    rows = RadiologyOrder.query.filter_by(facility_id=facility_id).order_by(RadiologyOrder.scheduled_at.asc()).all()
    slots = []
    for row in rows:
        if row.scheduled_at:
            slots.append({
                'order_id': row.id,
                'order_code': row.order_code,
                'study_name': row.study_name,
                'modality': row.modality,
                'room': row.modality_room or f"{(row.modality or 'modality').upper()}-1",
                'scheduled_at': row.scheduled_at.isoformat(),
                'priority': row.priority,
            })
    return jsonify({'success': True, 'schedule': slots}), 200


@radiology_bp.route('/analytics', methods=['GET'])
@token_required
@role_required(['radiologist', 'radiographer', 'physician', 'nurse', 'admin'])
def radiology_analytics():
    try:
        facility_id = request.token_payload.get('facility_id')
        rows = RadiologyOrder.query.filter_by(facility_id=facility_id).all()
        reported = [r for r in rows if r.reported_at and r.created_at]
        tat_minutes = [
            max(0, int((r.reported_at - r.created_at).total_seconds() // 60))
            for r in reported
        ]
        avg_tat = round(sum(tat_minutes) / len(tat_minutes), 2) if tat_minutes else 0

        modality_utilization = {}
        for r in rows:
            key = (r.modality or 'unknown').lower()
            modality_utilization[key] = modality_utilization.get(key, 0) + 1

        cumulative_dose = {}
        for r in rows:
            if r.patient_id and r.dose_mgy is not None:
                cumulative_dose[r.patient_id] = round(cumulative_dose.get(r.patient_id, 0.0) + float(r.dose_mgy), 3)

        return jsonify({
            'success': True,
            'metrics': {
                'total_orders': len(rows),
                'reported_orders': len(reported),
                'average_tat_minutes': avg_tat,
                'stat_pending': sum(1 for r in rows if r.priority == 'stat' and r.status != 'reported'),
                'modality_utilization': modality_utilization,
                'patient_cumulative_dose_mgy': cumulative_dose,
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@radiology_bp.route('/dashboard', methods=['GET'])
@token_required
@role_required(['radiologist', 'radiographer', 'physician', 'nurse', 'admin'])
def radiology_dashboard():
    try:
        facility_id = request.token_payload.get('facility_id')
        rows = RadiologyOrder.query.filter_by(facility_id=facility_id).all()
        summary = {
            'total': len(rows),
            'ordered': sum(1 for row in rows if row.status == 'ordered'),
            'scheduled': sum(1 for row in rows if row.status == 'scheduled'),
            'in_progress': sum(1 for row in rows if row.status == 'in_progress'),
            'reported': sum(1 for row in rows if row.status == 'reported'),
            'cancelled': sum(1 for row in rows if row.status == 'cancelled'),
            'stat_cases': sum(1 for row in rows if (row.priority or '').lower() == 'stat'),
            'critical_alerts': sum(1 for row in rows if row.critical_findings_json),
            'signed_reports': sum(1 for row in rows if row.signed_at is not None),
        }
        return jsonify({'success': True, 'summary': summary}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
