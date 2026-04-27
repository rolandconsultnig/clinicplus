"""
Patient Portal API Routes for Clinic+
"""

from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.patient_portal import PortalMessage, PortalAccessLog
from src.models.auth import AuditLog
from datetime import datetime
import json
import uuid

portal_bp = Blueprint('portal', __name__)

@portal_bp.route('/portal/messages', methods=['GET'])
@token_required
@role_required(['Patient'])
def get_portal_messages():
    """Get patient portal messages"""
    try:
        user = request.current_user
        status = request.args.get('status')
        message_type = request.args.get('message_type')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        query = PortalMessage.query.filter_by(
            patient_id=user.patient_id,
            is_active=True
        )
        
        if status:
            query = query.filter_by(status=status)
        if message_type:
            query = query.filter_by(message_type=message_type)
        
        query = query.order_by(PortalMessage.created_at.desc())
        messages = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'messages': [msg.to_dict() for msg in messages.items],
            'total': messages.total,
            'page': page,
            'per_page': per_page,
            'pages': messages.pages
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@portal_bp.route('/portal/messages/<int:msg_id>', methods=['GET'])
@token_required
@role_required(['Patient'])
def get_portal_message(msg_id):
    """Get specific portal message"""
    try:
        user = request.current_user
        message = PortalMessage.query.get_or_404(msg_id)
        
        if message.patient_id != user.patient_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Mark as read
        if message.status == 'unread':
            message.status = 'read'
            message.read_at = datetime.utcnow()
            db.session.commit()
        
        return jsonify({
            'success': True,
            'message': message.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@portal_bp.route('/portal/messages', methods=['POST'])
@token_required
@role_required(['Patient'])
def create_portal_message():
    """Send message from patient portal"""
    try:
        data = request.get_json()
        user = request.current_user
        
        if not data.get('subject') or not data.get('message_body'):
            return jsonify({'error': 'subject and message_body are required'}), 400
        
        message = PortalMessage(
            patient_id=user.patient_id,
            provider_id=data.get('provider_id'),
            facility_id=user.facility_id,
            subject=data['subject'],
            message_body=data['message_body'],
            message_type=data.get('message_type', 'general'),
            is_from_patient=True,
            related_appointment_id=data.get('related_appointment_id'),
            related_prescription_id=data.get('related_prescription_id'),
            related_lab_result_id=data.get('related_lab_result_id'),
            attachments=json.dumps(data.get('attachments', [])) if data.get('attachments') else None
        )
        
        db.session.add(message)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': message.to_dict(),
            'message_text': 'Message sent successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@portal_bp.route('/portal/access-logs', methods=['GET'])
@token_required
@role_required(['Patient', 'System Administrator'])
def get_portal_access_logs():
    """Get portal access logs"""
    try:
        user = request.current_user
        patient_id = request.args.get('patient_id', type=int)
        access_type = request.args.get('access_type')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        query = PortalAccessLog.query
        
        if user.user_type == 'Patient':
            query = query.filter_by(patient_id=user.patient_id)
        elif patient_id:
            query = query.filter_by(patient_id=patient_id)
        
        if access_type:
            query = query.filter_by(access_type=access_type)
        
        query = query.order_by(PortalAccessLog.created_at.desc())
        logs = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'logs': [log.to_dict() for log in logs.items],
            'total': logs.total,
            'page': page,
            'per_page': per_page,
            'pages': logs.pages
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@portal_bp.route('/portal/log-access', methods=['POST'])
@token_required
@role_required(['Patient'])
def log_portal_access():
    """Log portal access"""
    try:
        data = request.get_json()
        user = request.current_user
        
        log = PortalAccessLog(
            patient_id=user.patient_id,
            access_type=data.get('access_type', 'login'),
            resource_type=data.get('resource_type'),
            resource_id=data.get('resource_id'),
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        db.session.add(log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'log': log.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ============================================================================
# NEW ENDPOINTS FOR PHASE 2 IMPROVEMENTS
# ============================================================================

@portal_bp.route('/portal/prescriptions', methods=['GET'])
@token_required
@role_required(['Patient'])
def get_patient_prescriptions():
    """Get patient's prescriptions"""
    try:
        from src.models.prescribing import Prescription
        
        user = request.current_user
        patient_id = request.args.get('patient_id', user.patient_id, type=int)
        
        # Ensure patient can only see their own prescriptions
        if user.user_type == 'Patient' and patient_id != user.patient_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        prescriptions = Prescription.query.filter_by(
            patient_id=patient_id
        ).order_by(Prescription.prescribed_date.desc()).all()
        
        return jsonify({
            'success': True,
            'prescriptions': [p.to_dict() for p in prescriptions]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@portal_bp.route('/portal/prescriptions/<int:prescription_id>/refill', methods=['POST'])
@token_required
@role_required(['Patient'])
def request_prescription_refill(prescription_id):
    """Request prescription refill"""
    try:
        from src.models.prescribing import Prescription
        
        user = request.current_user
        prescription = Prescription.query.get_or_404(prescription_id)
        
        # Verify patient owns this prescription
        if prescription.patient_id != user.patient_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Check if prescription is refillable
        if prescription.status not in ['active', 'refillable']:
            return jsonify({'error': 'Prescription is not refillable'}), 400
        
        # Persist refill request as a portal message to care team/pharmacy queue
        refill_message = PortalMessage(
            patient_id=user.patient_id,
            provider_id=prescription.provider_id,
            facility_id=user.facility_id,
            subject=f"Refill request for {prescription.drug_name}",
            message_body=f"Patient requested refill for prescription {prescription.prescription_id}.",
            message_type='refill_request',
            is_from_patient=True,
            related_prescription_id=prescription.id
        )
        db.session.add(refill_message)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Refill request submitted successfully',
            'refill_request': refill_message.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@portal_bp.route('/portal/documents/upload', methods=['POST'])
@token_required
@role_required(['Patient'])
def upload_patient_document():
    """Upload patient document"""
    try:
        from src.models.documents import Document
        from werkzeug.utils import secure_filename
        import os
        
        user = request.current_user
        
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        document_type = request.form.get('document_type', 'patient_upload')
        patient_id = request.form.get('patient_id', user.patient_id, type=int)
        
        # Verify patient can only upload to their own account
        if user.user_type == 'Patient' and patient_id != user.patient_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Secure the filename
        filename = secure_filename(file.filename)
        
        # Create upload directory if it doesn't exist
        upload_dir = os.path.join('uploads', 'patient_documents', str(patient_id))
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        file_ext = os.path.splitext(filename)[1]
        unique_filename = f"{uuid.uuid4().hex}{file_ext}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        # Save file
        file.save(file_path)

        facility_id = request.token_payload.get('facility_id') or getattr(user, 'facility_id', None)
        if not facility_id:
            from src.models.patient import Patient
            patient = Patient.query.get(patient_id)
            facility_id = patient.facility_id if patient else None
        if not facility_id:
            return jsonify({'error': 'Facility context required for document upload'}), 400
        
        # Create document record
        document = Document(
            document_id=f"DOC-{uuid.uuid4().hex[:8].upper()}",
            title=request.form.get('title') or filename,
            patient_id=patient_id,
            document_type=document_type,
            category=request.form.get('category') or 'patient_upload',
            file_name=filename,
            file_path=file_path,
            file_size=os.path.getsize(file_path),
            facility_id=facility_id,
            created_by=user.id,
            source='uploaded',
            status='active',
            workflow_status='approved'
        )
        
        db.session.add(document)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Document uploaded successfully',
            'document': document.to_dict() if hasattr(document, 'to_dict') else {'id': document.id}
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@portal_bp.route('/portal/health-metrics', methods=['GET'])
@token_required
@role_required(['Patient'])
def get_health_metrics():
    """Get patient health metrics"""
    try:
        from src.models.clinical import VitalSigns
        
        user = request.current_user
        patient_id = request.args.get('patient_id', user.patient_id, type=int)
        
        # Verify patient can only see their own metrics
        if user.user_type == 'Patient' and patient_id != user.patient_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Get recent vitals (last 30 days)
        from datetime import timedelta
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        vitals = VitalSigns.query.filter(
            VitalSigns.patient_id == patient_id,
            VitalSigns.recorded_at >= thirty_days_ago
        ).order_by(VitalSigns.recorded_at.desc()).all()
        
        # Try to get optional health metrics model if available
        health_metrics = []
        try:
            from src.models.patient import HealthMetric
            health_metrics = HealthMetric.query.filter_by(
                patient_id=patient_id
            ).order_by(HealthMetric.recorded_date.desc()).limit(30).all()
        except:
            pass
        
        metrics = {
            'vitals': [v.to_dict() for v in vitals],
            'health_metrics': [m.to_dict() for m in health_metrics] if health_metrics else [],
            'summary': {
                'latest_weight': vitals[0].weight if vitals and vitals[0].weight else None,
                'latest_bp': f"{vitals[0].systolic_bp}/{vitals[0].diastolic_bp}" if vitals and vitals[0].systolic_bp else None,
                'latest_heart_rate': vitals[0].heart_rate if vitals and vitals[0].heart_rate else None,
                'total_readings': len(vitals)
            }
        }
        
        return jsonify({
            'success': True,
            'metrics': metrics
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@portal_bp.route('/patients/records/<int:record_id>/download', methods=['GET'])
@token_required
@role_required(['Patient', 'Physician', 'System Administrator'])
def download_patient_record(record_id):
    """Get download URL for patient record"""
    try:
        from src.models.documents import Document
        
        user = request.current_user
        document = Document.query.get_or_404(record_id)
        
        # Verify patient can only download their own records
        if user.user_type == 'Patient' and document.patient_id != user.patient_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Return API URL for authenticated document streaming/downloading.
        download_url = f"/api/documents/download/{document.document_id}"
        
        return jsonify({
            'success': True,
            'url': download_url,
            'document_name': document.file_name,
            'file_size': document.file_size
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@portal_bp.route('/portal/self-service/balance', methods=['GET'])
@token_required
@role_required(['Patient', 'patient'])
def portal_self_balance():
    """Open statements / estimated balance."""
    try:
        from src.models.billing import Statement
        user = request.current_user
        pid = user.patient_id
        if not pid:
            return jsonify({'error': 'No patient link'}), 400
        stmts = Statement.query.filter_by(patient_id=pid, status='open').all()
        total = sum(float(s.balance_due) for s in stmts) if stmts else 0.0
        return jsonify({
            'success': True,
            'open_statements': [s.to_dict() for s in stmts],
            'total_open_balance': total,
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@portal_bp.route('/portal/self-service/appointments', methods=['POST'])
@token_required
@role_required(['Patient', 'patient'])
def portal_self_book_appointment():
    """Self-service appointment booking."""
    try:
        from src.models.scheduling import Appointment
        from src.models.auth import UserAccount
        data = request.get_json() or {}
        user = request.current_user
        ua = UserAccount.query.get(user.id)
        pid = user.patient_id
        if not pid:
            return jsonify({'error': 'No patient context'}), 400
        provider_id = data.get('provider_id')
        facility_id = data.get('facility_id') or ua.facility_id
        apd = data.get('appointment_date')
        apt = data.get('appointment_time')
        if not all([provider_id, facility_id, apd, apt]):
            return jsonify({
                'error': 'provider_id, facility_id, appointment_date, appointment_time required',
            }), 400
        from datetime import date as ddate, time as dtime
        ad = ddate.fromisoformat(str(apd)) if not isinstance(apd, ddate) else apd
        if isinstance(apt, str) and len(apt) >= 4:
            parts = str(apt).replace('.', ':').split(':')
            h, m = int(parts[0]), int(parts[1]) if len(parts) > 1 else 0
            at = dtime(h, m)
        else:
            at = apt
        ap = Appointment(
            appointment_id=f"APT-SR-{uuid.uuid4().hex[:10].upper()}",
            patient_id=pid,
            provider_id=provider_id,
            facility_id=facility_id,
            appointment_type=data.get('appointment_type', 'follow_up'),
            appointment_date=ad,
            appointment_time=at,
            status='scheduled',
            reason_for_visit=data.get('reason_for_visit', 'Patient self-service booking'),
        )
        db.session.add(ap)
        db.session.commit()
        return jsonify({'success': True, 'appointment': ap.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
