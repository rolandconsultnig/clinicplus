"""
Messaging Management Routes - Comprehensive OpenEMR-style messaging
Includes messages, trusted messages, office notes, patient notes, batch communication
"""
from flask import Blueprint, request, jsonify
from src.models.messaging import Message
from src.models.patient import Patient
from src.models.auth import UserAccount
from src.models.user import db
from src.auth.jwt_manager import token_required, role_required
from datetime import datetime
import uuid

messaging_mgmt_bp = Blueprint('messaging_mgmt', __name__)

@messaging_mgmt_bp.route('/messages', methods=['GET'])
@token_required
def get_messages():
    """Get messages for current user"""
    try:
        user_id = request.current_user.id if hasattr(request, 'current_user') else None
        message_type = request.args.get('type')  # inbox, sent, all
        is_read = request.args.get('is_read')
        
        query = Message.query
        
        if message_type == 'inbox':
            query = query.filter_by(recipient_id=user_id)
        elif message_type == 'sent':
            query = query.filter_by(sender_id=user_id)
        else:
            query = query.filter(
                db.or_(
                    Message.sender_id == user_id,
                    Message.recipient_id == user_id
                )
            )
        
        if is_read is not None:
            is_read_bool = is_read.lower() == 'true'
            query = query.filter(Message.status == ('read' if is_read_bool else 'unread'))
        
        messages = query.order_by(Message.created_at.desc()).limit(100).all()
        
        return jsonify({
            'success': True,
            'messages': [m.to_dict() if hasattr(m, 'to_dict') else {} for m in messages]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@messaging_mgmt_bp.route('/messages', methods=['POST'])
@token_required
def send_message():
    """Send a message"""
    try:
        data = request.get_json()
        sender_id = request.current_user.id if hasattr(request, 'current_user') else None
        facility_id = request.token_payload.get('facility_id')
        recipient_id = data.get('recipient_id')
        if not recipient_id:
            return jsonify({'error': 'recipient_id is required'}), 400
        recipient = UserAccount.query.get(recipient_id)
        if not recipient:
            return jsonify({'error': 'recipient not found'}), 404
        
        message = Message(
            message_id=f"MSG-{uuid.uuid4().hex[:12].upper()}",
            sender_id=sender_id,
            recipient_id=recipient_id,
            facility_id=facility_id or recipient.facility_id,
            subject=data.get('subject', ''),
            message_body=data['message_body'],
            message_type=data.get('message_type', 'general'),
            priority=data.get('priority', 'normal'),
            status='unread',
            created_at=datetime.utcnow()
        )
        
        db.session.add(message)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': message.to_dict() if hasattr(message, 'to_dict') else {}
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@messaging_mgmt_bp.route('/batch-email', methods=['POST'])
@token_required
@role_required(['System Administrator', 'Receptionist'])
def send_batch_email():
    """Send batch email notifications"""
    try:
        data = request.get_json()
        recipients = data.get('recipients', [])  # List of patient IDs or email addresses
        subject = data['subject']
        message_body = data['message_body']
        facility_id = request.token_payload.get('facility_id')
        sender_id = getattr(request.current_user, 'id', None)

        sent = 0
        failed = 0
        resolved = []
        for recipient in recipients:
            user = None
            if isinstance(recipient, int):
                user = UserAccount.query.get(recipient)
            elif isinstance(recipient, str) and recipient.isdigit():
                user = UserAccount.query.get(int(recipient))
            elif isinstance(recipient, str):
                user = UserAccount.query.filter_by(email=recipient).first()
            if not user:
                failed += 1
                continue
            msg = Message(
                message_id=f"MSG-{uuid.uuid4().hex[:12].upper()}",
                sender_id=sender_id,
                recipient_id=user.id,
                facility_id=facility_id or user.facility_id,
                subject=subject,
                message_body=message_body,
                message_type='batch_email',
                priority='normal',
                status='unread',
            )
            db.session.add(msg)
            resolved.append(user.id)
            sent += 1
        db.session.commit()

        results = {
            'sent': sent,
            'failed': failed,
            'recipients': resolved
        }
        
        return jsonify({'success': True, 'results': results}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@messaging_mgmt_bp.route('/batch-sms', methods=['POST'])
@token_required
@role_required(['System Administrator', 'Receptionist'])
def send_batch_sms():
    """Send batch SMS notifications"""
    try:
        data = request.get_json()
        recipients = data.get('recipients', [])  # List of patient IDs
        message = data['message']
        facility_id = request.token_payload.get('facility_id')
        sender_id = getattr(request.current_user, 'id', None)
        
        # Get patient phone numbers
        patients = Patient.query.filter(Patient.id.in_(recipients)).all()

        sent = 0
        for patient in patients:
            if not patient.user_account_id:
                continue
            msg = Message(
                message_id=f"MSG-{uuid.uuid4().hex[:12].upper()}",
                sender_id=sender_id,
                recipient_id=patient.user_account_id,
                facility_id=facility_id or patient.facility_id,
                subject='SMS Notification',
                message_body=message,
                message_type='batch_sms',
                priority='normal',
                status='unread',
                related_patient_id=patient.id
            )
            db.session.add(msg)
            sent += 1
        db.session.commit()

        results = {
            'sent': sent,
            'failed': max(0, len(patients) - sent),
            'recipients': [p.id for p in patients if p.user_account_id]
        }
        
        return jsonify({'success': True, 'results': results}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@messaging_mgmt_bp.route('/batch-reminders', methods=['POST'])
@token_required
@role_required(['System Administrator', 'Receptionist'])
def send_batch_reminders():
    """Send batch appointment reminders"""
    try:
        data = request.get_json()
        reminder_type = data.get('type', 'appointment')  # appointment, lab_result, prescription
        days_ahead = data.get('days_ahead', 1)
        
        from src.models.scheduling import Appointment
        from datetime import date, timedelta
        
        target_date = date.today() + timedelta(days=days_ahead)
        facility_id = request.token_payload.get('facility_id')
        appointments = Appointment.query.filter_by(
            appointment_date=target_date,
            status='scheduled',
            facility_id=facility_id
        ).all()
        
        # Send reminders
        sent_count = 0
        for apt in appointments:
            patient = Patient.query.get(apt.patient_id)
            if not patient or not patient.user_account_id:
                continue
            reminder_text = (
                f"Reminder: You have an appointment on {target_date.isoformat()} "
                f"at {apt.appointment_time.strftime('%H:%M') if apt.appointment_time else ''}."
            )
            msg = Message(
                message_id=f"MSG-{uuid.uuid4().hex[:12].upper()}",
                sender_id=getattr(request.current_user, 'id', None),
                recipient_id=patient.user_account_id,
                facility_id=facility_id or patient.facility_id,
                subject='Appointment Reminder',
                message_body=reminder_text,
                message_type='appointment_reminder',
                priority='normal',
                status='unread',
                related_patient_id=patient.id,
                related_appointment_id=apt.id
            )
            db.session.add(msg)
            apt.reminder_sent_sms = True
            apt.reminder_sent_at = datetime.utcnow()
            sent_count += 1
        db.session.commit()
        
        return jsonify({
            'success': True,
            'reminders_sent': sent_count,
            'target_date': target_date.isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@messaging_mgmt_bp.route('/office-notes', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_office_notes():
    """Get office notes"""
    try:
        facility_id = request.token_payload.get('facility_id')
        notes = Message.query.filter(
            Message.facility_id == facility_id,
            Message.message_type == 'office_note',
            Message.is_active == True
        ).order_by(Message.created_at.desc()).limit(200).all()
        
        return jsonify({
            'success': True,
            'notes': [n.to_dict() for n in notes]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@messaging_mgmt_bp.route('/patient-notes/<int:patient_id>', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_patient_notes(patient_id):
    """Get patient notes"""
    try:
        Patient.query.get_or_404(patient_id)
        
        # Get clinical notes for patient
        from src.models.clinical import ClinicalNote
        notes = ClinicalNote.query.filter_by(patient_id=patient_id)\
            .order_by(ClinicalNote.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'notes': [n.to_dict() for n in notes]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@messaging_mgmt_bp.route('/recalls', methods=['GET'])
@token_required
@role_required(['Receptionist', 'System Administrator'])
def get_recalls():
    """Get patient recalls"""
    try:
        from src.models.scheduling import Appointment
        from datetime import date, timedelta

        facility_id = request.token_payload.get('facility_id')
        lookback = date.today() - timedelta(days=30)
        appointments = Appointment.query.filter(
            Appointment.facility_id == facility_id,
            Appointment.appointment_date >= lookback,
            Appointment.status.in_(['no_show', 'cancelled'])
        ).order_by(Appointment.appointment_date.desc()).all()
        recalls = []
        for apt in appointments:
            patient = Patient.query.get(apt.patient_id)
            recalls.append({
                'appointment_id': apt.id,
                'appointment_date': apt.appointment_date.isoformat() if apt.appointment_date else None,
                'status': apt.status,
                'patient_id': apt.patient_id,
                'patient_name': f"{patient.first_name} {patient.last_name}" if patient else 'Unknown',
                'patient_mrn': patient.universal_patient_id if patient else None,
                'reason': apt.reason_for_visit
            })
        
        return jsonify({
            'success': True,
            'recalls': recalls
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

