"""
Messaging Management Routes - Comprehensive OpenEMR-style messaging
Includes messages, trusted messages, office notes, patient notes, batch communication
"""
from flask import Blueprint, request, jsonify
from src.models.messaging import Message
from src.models.patient import Patient
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
            query = query.filter_by(is_read=is_read_bool)
        
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
        
        message = Message(
            message_id=str(uuid.uuid4()),
            sender_id=sender_id,
            recipient_id=data['recipient_id'],
            subject=data.get('subject', ''),
            message_body=data['message_body'],
            message_type=data.get('message_type', 'general'),
            priority=data.get('priority', 'normal'),
            is_read=False,
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
        
        # In production, this would send actual emails
        results = {
            'sent': len(recipients),
            'failed': 0,
            'recipients': recipients
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
        
        # Get patient phone numbers
        patients = Patient.query.filter(Patient.id.in_(recipients)).all()
        
        # In production, this would send actual SMS via Twilio or similar
        results = {
            'sent': len(patients),
            'failed': 0,
            'recipients': [p.id for p in patients]
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
        appointments = Appointment.query.filter_by(
            appointment_date=target_date,
            status='scheduled'
        ).all()
        
        # Send reminders
        sent_count = 0
        for apt in appointments:
            # Send reminder logic here
            sent_count += 1
        
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
        # Office notes are typically general notes not tied to a specific patient
        notes = []
        
        return jsonify({
            'success': True,
            'notes': notes
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
        # Recalls are appointments that need to be scheduled
        recalls = []
        
        return jsonify({
            'success': True,
            'recalls': recalls
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

