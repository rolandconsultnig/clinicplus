"""
Internal Messaging System API Routes for Clinic+
"""

import os
import json
import uuid
from pathlib import Path
from datetime import datetime

from flask import Blueprint, request, jsonify, Response, stream_with_context, current_app, send_file
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.messaging import Message, MessageTemplate
from src.models.auth import AuditLog
from werkzeug.utils import secure_filename

messaging_bp = Blueprint('messaging', __name__)


def _attachment_serializer():
    return URLSafeTimedSerializer(current_app.config['SECRET_KEY'], salt='msg-attachments-v1')


def _message_attachments(message: Message):
    raw = message.attachments
    if not raw:
        return []
    try:
        val = json.loads(raw)
        return val if isinstance(val, list) else []
    except Exception:
        return []


def _can_access_message(user, message: Message):
    return message.recipient_id == user.id or message.sender_id == user.id


def _unread_count_for_user(user_id: int) -> int:
    return Message.query.filter_by(recipient_id=user_id, is_active=True, status='unread').count()


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


@messaging_bp.route('/messages/poll', methods=['GET'])
@token_required
def poll_messages():
    """Lightweight poll for new messages (after_id and/or since ISO timestamp)."""
    try:
        user = request.current_user
        folder = request.args.get('folder', 'inbox')
        after_id = request.args.get('after_id', type=int)
        since_raw = request.args.get('since')
        limit = request.args.get('limit', 50, type=int) or 50
        limit = min(max(limit, 1), 100)

        if folder == 'inbox':
            query = Message.query.filter_by(recipient_id=user.id, is_active=True)
        elif folder == 'sent':
            query = Message.query.filter_by(sender_id=user.id, is_active=True)
        elif folder == 'archived':
            query = Message.query.filter(
                ((Message.recipient_id == user.id) | (Message.sender_id == user.id)),
                Message.status == 'archived',
                Message.is_active == True,
            )
        else:
            query = Message.query.filter(
                ((Message.recipient_id == user.id) | (Message.sender_id == user.id)),
                Message.is_active == True,
            )

        if after_id is not None:
            query = query.filter(Message.id > after_id)
        if since_raw:
            try:
                since_dt = datetime.fromisoformat(since_raw.replace('Z', '+00:00'))
            except ValueError:
                return jsonify({'error': 'Invalid since (use ISO-8601 datetime)'}), 400
            # DB timestamps are naive UTC; strip tz for reliable SQL comparison
            if since_dt.tzinfo is not None:
                since_dt = since_dt.replace(tzinfo=None)
            query = query.filter(Message.sent_at > since_dt)

        messages = query.order_by(Message.id.asc()).limit(limit).all()
        return jsonify({
            'success': True,
            'messages': [msg.to_dict() for msg in messages],
            'count': len(messages),
            'unread_count': _unread_count_for_user(user.id),
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@messaging_bp.route('/messages/unread-summary', methods=['GET'])
@token_required
def unread_summary():
    """Unread counters for compact notification badges."""
    try:
        user = request.current_user
        unread = _unread_count_for_user(user.id)
        recent_unread = Message.query.filter_by(recipient_id=user.id, is_active=True, status='unread') \
            .order_by(Message.sent_at.desc()).limit(5).all()
        return jsonify({
            'success': True,
            'unread_count': unread,
            'recent_unread': [m.to_dict() for m in recent_unread],
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@messaging_bp.route('/messages/search', methods=['GET'])
@token_required
def search_messages():
    """Full-text-lite search across subject/body for current user's messages."""
    try:
        user = request.current_user
        q = (request.args.get('q') or '').strip()
        if len(q) < 2:
            return jsonify({'error': 'q must be at least 2 characters'}), 400
        limit = min(max(request.args.get('limit', 50, type=int) or 50, 1), 200)
        query = Message.query.filter(
            ((Message.recipient_id == user.id) | (Message.sender_id == user.id)),
            Message.is_active == True,
            ((Message.subject.ilike(f'%{q}%')) | (Message.message_body.ilike(f'%{q}%'))),
        ).order_by(Message.sent_at.desc())
        rows = query.limit(limit).all()
        return jsonify({'success': True, 'messages': [m.to_dict() for m in rows], 'count': len(rows)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@messaging_bp.route('/messages/group', methods=['POST'])
@token_required
def create_group_message():
    """
    Fan-out group message: creates one message per recipient sharing same thread_id.
    """
    try:
        data = request.get_json() or {}
        user = request.current_user
        recipient_ids = data.get('recipient_ids') or []
        subject = (data.get('subject') or '').strip()
        message_body = (data.get('message_body') or '').strip()
        if not recipient_ids or not isinstance(recipient_ids, list):
            return jsonify({'error': 'recipient_ids (list) is required'}), 400
        if not subject or not message_body:
            return jsonify({'error': 'subject and message_body are required'}), 400
        thread_id = data.get('thread_id') or f"THREAD-{uuid.uuid4().hex[:12].upper()}"
        created = []
        for rid in recipient_ids:
            msg = Message(
                message_id=f"MSG-{uuid.uuid4().hex[:12].upper()}",
                sender_id=user.id,
                recipient_id=int(rid),
                facility_id=data.get('facility_id', user.facility_id),
                subject=subject,
                message_body=message_body,
                message_type=data.get('message_type', 'general'),
                thread_id=thread_id,
                priority=data.get('priority', 'normal'),
                related_patient_id=data.get('related_patient_id'),
                related_encounter_id=data.get('related_encounter_id'),
                related_appointment_id=data.get('related_appointment_id'),
            )
            db.session.add(msg)
            created.append(msg)
        db.session.commit()
        return jsonify({
            'success': True,
            'thread_id': thread_id,
            'count': len(created),
            'messages': [m.to_dict() for m in created],
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@messaging_bp.route('/messages/thread/<thread_id>', methods=['GET'])
@token_required
def get_thread_messages(thread_id):
    """Return a thread's messages for current user."""
    try:
        user = request.current_user
        query = Message.query.filter(
            Message.thread_id == thread_id,
            ((Message.recipient_id == user.id) | (Message.sender_id == user.id)),
            Message.is_active == True,
        ).order_by(Message.sent_at.asc())
        rows = query.all()
        return jsonify({'success': True, 'thread_id': thread_id, 'messages': [m.to_dict() for m in rows]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@messaging_bp.route('/messages/<int:msg_id>/read-receipt', methods=['POST'])
@token_required
def message_read_receipt(msg_id):
    """Explicitly mark a message as read and return timestamp."""
    try:
        user = request.current_user
        message = Message.query.get_or_404(msg_id)
        if message.recipient_id != user.id:
            return jsonify({'error': 'Only recipient can mark read'}), 403
        if message.status == 'unread':
            message.status = 'read'
            message.read_at = datetime.utcnow()
            db.session.commit()
        return jsonify({'success': True, 'message_id': msg_id, 'read_at': message.read_at.isoformat() if message.read_at else None}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@messaging_bp.route('/messages/attachments/sign-upload', methods=['POST'])
@token_required
def sign_attachment_upload():
    """
    Create a short-lived signed token to upload an attachment for a specific message.
    """
    try:
        data = request.get_json() or {}
        message_id = data.get('message_id')
        file_name = (data.get('file_name') or '').strip()
        content_type = (data.get('content_type') or 'application/octet-stream').strip()
        size_bytes = int(data.get('size_bytes') or 0)
        if not message_id or not file_name:
            return jsonify({'error': 'message_id and file_name required'}), 400
        if size_bytes < 0 or size_bytes > 20 * 1024 * 1024:
            return jsonify({'error': 'Attachment size must be <= 20MB'}), 400

        message = Message.query.get_or_404(message_id)
        if not _can_access_message(request.current_user, message):
            return jsonify({'error': 'Unauthorized'}), 403

        token = _attachment_serializer().dumps({
            'message_id': message.id,
            'user_id': request.current_user.id,
            'file_name': file_name,
            'content_type': content_type,
            'size_bytes': size_bytes,
        })
        return jsonify({
            'success': True,
            'upload_token': token,
            'expires_in_seconds': 900,
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@messaging_bp.route('/messages/attachments/upload', methods=['POST'])
@token_required
def upload_message_attachment():
    """
    Upload attachment using signed upload token, persist metadata on message.
    """
    try:
        token = request.form.get('upload_token') or request.headers.get('X-Upload-Token')
        if not token:
            return jsonify({'error': 'upload_token required'}), 400
        try:
            payload = _attachment_serializer().loads(token, max_age=900)
        except SignatureExpired:
            return jsonify({'error': 'upload token expired'}), 400
        except BadSignature:
            return jsonify({'error': 'invalid upload token'}), 400

        if payload.get('user_id') != request.current_user.id:
            return jsonify({'error': 'token/user mismatch'}), 403

        message = Message.query.get_or_404(payload.get('message_id'))
        if not _can_access_message(request.current_user, message):
            return jsonify({'error': 'Unauthorized'}), 403

        f = request.files.get('file')
        if not f:
            return jsonify({'error': 'file multipart field required'}), 400

        orig_name = secure_filename(payload.get('file_name') or f.filename or 'attachment.bin')
        ext = Path(orig_name).suffix
        saved_name = f"{uuid.uuid4().hex}{ext}"
        base = Path(current_app.static_folder or 'static') / 'uploads' / 'message_attachments' / str(message.id)
        base.mkdir(parents=True, exist_ok=True)
        abs_path = base / saved_name
        f.save(str(abs_path))
        file_size = abs_path.stat().st_size

        rel_path = f"/uploads/message_attachments/{message.id}/{saved_name}"
        attachment = {
            'id': f"ATT-{uuid.uuid4().hex[:10].upper()}",
            'file_name': orig_name,
            'content_type': payload.get('content_type') or f.mimetype or 'application/octet-stream',
            'size_bytes': file_size,
            'path': rel_path,
            'uploaded_by': request.current_user.id,
            'uploaded_at': datetime.utcnow().isoformat() + 'Z',
        }
        existing = _message_attachments(message)
        existing.append(attachment)
        message.attachments = json.dumps(existing)
        db.session.commit()

        download_token = _attachment_serializer().dumps({
            'message_id': message.id,
            'attachment_id': attachment['id'],
            'user_id': request.current_user.id,
        })
        return jsonify({
            'success': True,
            'attachment': attachment,
            'download_token': download_token,
            'download_url': '/api/messages/attachments/download?token=' + download_token,
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@messaging_bp.route('/messages/attachments/sign-download', methods=['POST'])
@token_required
def sign_attachment_download():
    """Create short-lived signed download token for an attachment user can access."""
    try:
        data = request.get_json() or {}
        message_id = data.get('message_id')
        attachment_id = data.get('attachment_id')
        if not message_id or not attachment_id:
            return jsonify({'error': 'message_id and attachment_id required'}), 400
        message = Message.query.get_or_404(message_id)
        if not _can_access_message(request.current_user, message):
            return jsonify({'error': 'Unauthorized'}), 403
        attachments = _message_attachments(message)
        attachment = next((a for a in attachments if a.get('id') == attachment_id), None)
        if not attachment:
            return jsonify({'error': 'attachment not found'}), 404
        token = _attachment_serializer().dumps({
            'message_id': message.id,
            'attachment_id': attachment_id,
            'user_id': request.current_user.id,
        })
        return jsonify({
            'success': True,
            'download_token': token,
            'download_url': '/api/messages/attachments/download?token=' + token,
            'expires_in_seconds': 3600,
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@messaging_bp.route('/messages/attachments/download', methods=['GET'])
@token_required
def download_message_attachment():
    """
    Download attachment with signed token and message access checks.
    """
    try:
        token = request.args.get('token', '')
        if not token:
            return jsonify({'error': 'token required'}), 400
        try:
            payload = _attachment_serializer().loads(token, max_age=86400)
        except SignatureExpired:
            return jsonify({'error': 'download token expired'}), 400
        except BadSignature:
            return jsonify({'error': 'invalid download token'}), 400

        message = Message.query.get_or_404(payload.get('message_id'))
        if not _can_access_message(request.current_user, message):
            return jsonify({'error': 'Unauthorized'}), 403

        attachments = _message_attachments(message)
        attachment = next((a for a in attachments if a.get('id') == payload.get('attachment_id')), None)
        if not attachment:
            return jsonify({'error': 'attachment not found'}), 404
        rel_path = attachment.get('path') or ''
        if not rel_path.startswith('/uploads/message_attachments/'):
            return jsonify({'error': 'invalid attachment path'}), 400
        abs_path = Path(current_app.static_folder or 'static') / rel_path.lstrip('/').replace('/', os.sep)
        if not abs_path.exists() or not abs_path.is_file():
            return jsonify({'error': 'file missing'}), 404
        return send_file(
            str(abs_path),
            as_attachment=True,
            download_name=attachment.get('file_name') or abs_path.name,
            mimetype=attachment.get('content_type') or 'application/octet-stream',
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@messaging_bp.route('/messages/attachments/<attachment_id>', methods=['DELETE'])
@token_required
def delete_message_attachment(attachment_id):
    """Remove an attachment metadata record and underlying file if sender deletes it."""
    try:
        message_id = request.args.get('message_id', type=int)
        if not message_id:
            return jsonify({'error': 'message_id required'}), 400
        message = Message.query.get_or_404(message_id)
        if message.sender_id != request.current_user.id:
            return jsonify({'error': 'Only sender can delete attachments'}), 403
        attachments = _message_attachments(message)
        target = next((a for a in attachments if a.get('id') == attachment_id), None)
        if not target:
            return jsonify({'error': 'attachment not found'}), 404
        rel_path = target.get('path') or ''
        if rel_path.startswith('/uploads/message_attachments/'):
            abs_path = Path(current_app.static_folder or 'static') / rel_path.lstrip('/').replace('/', os.sep)
            if abs_path.exists() and abs_path.is_file():
                try:
                    abs_path.unlink()
                except Exception:
                    pass
        remaining = [a for a in attachments if a.get('id') != attachment_id]
        message.attachments = json.dumps(remaining)
        db.session.commit()
        return jsonify({'success': True, 'attachments': remaining}), 200
    except Exception as e:
        db.session.rollback()
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


@messaging_bp.route('/messages/events', methods=['GET'])
@token_required
def message_events():
    """
    Server-Sent Events (SSE) channel. Heartbeat stream; connect workers to deliver live events.
    """
    uid = request.current_user.id

    @stream_with_context
    def gen():
        import time
        yield f"data: {json.dumps({'type': 'hello', 'user_id': uid, 'unread_count': _unread_count_for_user(uid)})}\n\n"
        for _ in range(5):
            time.sleep(15)
            yield f"data: {json.dumps({'type': 'ping', 't': datetime.utcnow().isoformat(), 'unread_count': _unread_count_for_user(uid)})}\n\n"

    return Response(
        gen(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
        },
    )

