"""
Audit Log Routes for Clinic+
Provides access to security audit logs for compliance and monitoring
"""

from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.auth import AuditLog, UserAccount
from datetime import datetime, timedelta
from sqlalchemy import desc

audit_bp = Blueprint('audit', __name__)

@audit_bp.route('/audit-logs', methods=['GET'])
@token_required
@role_required(['System Administrator', 'Facility Administrator'])
def get_audit_logs():
    """Get audit logs with filtering"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        action_type = request.args.get('action_type')
        resource_type = request.args.get('resource_type')
        user_id = request.args.get('user_id', type=int)
        patient_id = request.args.get('patient_id', type=int)
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        query = AuditLog.query
        
        # Apply filters
        if action_type:
            query = query.filter(AuditLog.action_type == action_type)
        if resource_type:
            query = query.filter(AuditLog.resource_type == resource_type)
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        if patient_id:
            query = query.filter(AuditLog.patient_id == patient_id)
        if date_from:
            try:
                date_from_obj = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                query = query.filter(AuditLog.timestamp >= date_from_obj)
            except:
                pass
        if date_to:
            try:
                date_to_obj = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
                query = query.filter(AuditLog.timestamp <= date_to_obj)
            except:
                pass
        
        # Order by most recent first
        query = query.order_by(desc(AuditLog.timestamp))
        
        # Paginate
        logs = query.paginate(page=page, per_page=per_page, error_out=False)
        
        logs_list = []
        for log in logs.items:
            log_dict = log.to_dict()
            # Get user info if available
            if log.user_id:
                user = UserAccount.query.get(log.user_id)
                if user:
                    log_dict['username'] = user.username
                    log_dict['user_email'] = user.email
            logs_list.append(log_dict)
        
        return jsonify({
            'success': True,
            'logs': logs_list,
            'total': logs.total,
            'page': page,
            'per_page': per_page,
            'pages': logs.pages
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@audit_bp.route('/audit-logs/<int:log_id>', methods=['GET'])
@token_required
@role_required(['System Administrator', 'Facility Administrator'])
def get_audit_log(log_id):
    """Get specific audit log details"""
    try:
        log = AuditLog.query.get_or_404(log_id)
        log_dict = log.to_dict()
        
        # Get user info if available
        if log.user_id:
            user = UserAccount.query.get(log.user_id)
            if user:
                log_dict['username'] = user.username
                log_dict['user_email'] = user.email
        
        return jsonify({
            'success': True,
            'log': log_dict
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@audit_bp.route('/audit-logs/stats', methods=['GET'])
@token_required
@role_required(['System Administrator', 'Facility Administrator'])
def get_audit_stats():
    """Get audit log statistics"""
    try:
        days = request.args.get('days', 30, type=int)
        date_from = datetime.utcnow() - timedelta(days=days)
        
        # Total logs
        total_logs = AuditLog.query.filter(AuditLog.timestamp >= date_from).count()
        
        # Logs by action type
        from sqlalchemy import func
        action_stats = db.session.query(
            AuditLog.action_type,
            func.count(AuditLog.id).label('count')
        ).filter(
            AuditLog.timestamp >= date_from
        ).group_by(AuditLog.action_type).all()
        
        # Logs by resource type
        resource_stats = db.session.query(
            AuditLog.resource_type,
            func.count(AuditLog.id).label('count')
        ).filter(
            AuditLog.timestamp >= date_from
        ).group_by(AuditLog.resource_type).all()
        
        # Unique users
        unique_users = db.session.query(
            func.count(func.distinct(AuditLog.user_id))
        ).filter(
            AuditLog.timestamp >= date_from,
            AuditLog.user_id.isnot(None)
        ).scalar()
        
        return jsonify({
            'success': True,
            'stats': {
                'total_logs': total_logs,
                'unique_users': unique_users or 0,
                'action_types': {action: count for action, count in action_stats},
                'resource_types': {resource: count for resource, count in resource_stats if resource}
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

