"""
Internal Messaging System API Routes for Clinic+
"""

from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.messaging import Message, MessageTemplate
from src.models.auth import AuditLog
from datetime import datetime
import json
import uuid

messaging_bp = Blueprint('messaging', __name__)

@messaging_bp.route('/messages', methods=['GET'])
@token_required
def get_messages():
    """Get messages (inbox/sent)"""
    try:
        user = request.current_user
        folder = request.args.get('folder', 'inbox')  # inbox, sent, archived
        status = request.args.get('status')
        priority = request.args.get('priority')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        if folder == 'inbox':
            query = Message.query.filter_by(recipient_id=user.id, is_active=True)
        elif folder == 'sent':
            query = Message.query.filter_by(sender_id=user.id, is_active=True)
        elif folder == 'archived':
            query = Message.query.filter(
                ((Message.recipient_id == user.id) | (Message.sender_id == user.id)),
                Message.status == 'archived',
                Message.is_active == True
            )
        else:
            query = Message.query.filter(
                ((Message.recipient_id == user.id) | (Message.sender_id == user.id)),
                Message.is_active == True
            )
        
        if status:
            query = query.filter_by(status=status)
        if priority:
            query = query.filter_by(priority=priority)
        
        query = query.order_by(Message.sent_at.desc())
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

@messaging_bp.route('/messages/<int:msg_id>', methods=['GET'])
@token_required
def get_message(msg_id):
    """Get specific message"""
    try:
        user = request.current_user
        message = Message.query.get_or_404(msg_id)
        
        # Check access
        if message.recipient_id != user.id and message.sender_id != user.id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Mark as read if recipient
        if message.recipient_id == user.id and message.status == 'unread':
            message.status = 'read'
            message.read_at = datetime.utcnow()
            db.session.commit()
        
        return jsonify({
            'success': True,
            'message': message.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@messaging_bp.route('/messages', methods=['POST'])
@token_required
def create_message():
    """Send new message"""
    try:
        data = request.get_json()
        user = request.current_user
        
        if not data.get('recipient_id') or not data.get('subject') or not data.get('message_body'):
            return jsonify({'error': 'recipient_id, subject, and message_body are required'}), 400
        
        # Generate thread_id if replying
        thread_id = data.get('thread_id')
        if not thread_id and data.get('parent_message_id'):
            parent = Message.query.get(data['parent_message_id'])
            thread_id = parent.thread_id if parent else f"THREAD-{uuid.uuid4().hex[:12].upper()}"
        elif not thread_id:
            thread_id = f"THREAD-{uuid.uuid4().hex[:12].upper()}"
        
        message = Message(
            message_id=f"MSG-{uuid.uuid4().hex[:12].upper()}",
            sender_id=user.id,
            recipient_id=data['recipient_id'],
            facility_id=data.get('facility_id', user.facility_id),
            subject=data['subject'],
            message_body=data['message_body'],
            message_type=data.get('message_type', 'general'),
            parent_message_id=data.get('parent_message_id'),
            thread_id=thread_id,
            priority=data.get('priority', 'normal'),
            related_patient_id=data.get('related_patient_id'),
            related_encounter_id=data.get('related_encounter_id'),
            related_appointment_id=data.get('related_appointment_id'),
            attachments=json.dumps(data.get('attachments', [])) if data.get('attachments') else None
        )
        
        db.session.add(message)
        
        # Audit log
        audit_log = AuditLog(
            log_id=f"MSG-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{message.id}",
            user_id=user.id,
            action_type='create',
            resource_type='message',
            resource_id=str(message.id),
            details=json.dumps({'recipient_id': message.recipient_id, 'subject': message.subject})
        )
        db.session.add(audit_log)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': message.to_dict(),
            'message_text': 'Message sent successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@messaging_bp.route('/messages/<int:msg_id>', methods=['PUT'])
@token_required
def update_message(msg_id):
    """Update message (mark as read, archive, etc.)"""
    try:
        user = request.current_user
        message = Message.query.get_or_404(msg_id)
        data = request.get_json()
        
        # Check access
        if message.recipient_id != user.id and message.sender_id != user.id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Update status
        if 'status' in data:
            message.status = data['status']
            if data['status'] == 'read' and not message.read_at:
                message.read_at = datetime.utcnow()
            elif data['status'] == 'archived':
                message.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': message.to_dict(),
            'message_text': 'Message updated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@messaging_bp.route('/message-templates', methods=['GET'])
@token_required
def get_message_templates():
    """Get message templates"""
    try:
        facility_id = request.args.get('facility_id', type=int)
        template_type = request.args.get('template_type')
        
        query = MessageTemplate.query.filter_by(is_active=True)
        
        if facility_id:
            query = query.filter((MessageTemplate.facility_id == facility_id) | (MessageTemplate.is_global == True))
        if template_type:
            query = query.filter_by(template_type=template_type)
        
        templates = query.all()
        
        return jsonify({
            'success': True,
            'templates': [tpl.to_dict() for tpl in templates]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

