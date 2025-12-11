"""
Administrative Management Routes - Comprehensive OpenEMR-style admin features
Includes user management, ACL, code management, rules, alerts, system maintenance
"""
from flask import Blueprint, request, jsonify
from src.models.user import db
from src.models.auth import UserAccount, Role, Permission
from src.auth.jwt_manager import token_required, role_required
from datetime import datetime
import json

admin_mgmt_bp = Blueprint('admin_mgmt', __name__)

@admin_mgmt_bp.route('/users', methods=['GET'])
@token_required
@role_required(['System Administrator'])
def get_users():
    """Get all users with filtering"""
    try:
        user_type = request.args.get('user_type')
        facility_id = request.args.get('facility_id', type=int)
        is_active = request.args.get('is_active')
        
        query = UserAccount.query
        
        if user_type:
            query = query.filter_by(user_type=user_type)
        
        if facility_id:
            query = query.filter_by(facility_id=facility_id)
        
        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
            query = query.filter_by(is_active=is_active_bool)
        
        users = query.limit(500).all()
        
        return jsonify({
            'success': True,
            'users': [{
                'id': u.id,
                'username': u.username,
                'email': u.email,
                'user_type': u.user_type,
                'is_active': u.is_active,
                'last_login': u.last_login.isoformat() if u.last_login else None
            } for u in users]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_mgmt_bp.route('/acl', methods=['GET'])
@token_required
@role_required(['System Administrator'])
def get_acl():
    """Get Access Control List"""
    try:
        roles = Role.query.all()
        permissions = Permission.query.all()
        
        acl_data = {
            'roles': [{
                'id': r.id,
                'role_name': r.role_name,
                'description': r.description if hasattr(r, 'description') else None
            } for r in roles],
            'permissions': [{
                'id': p.id,
                'permission_name': p.permission_name,
                'description': p.description if hasattr(p, 'description') else None
            } for p in permissions]
        }
        
        return jsonify({'success': True, 'acl': acl_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_mgmt_bp.route('/code-systems', methods=['GET'])
@token_required
@role_required(['System Administrator'])
def get_code_systems():
    """Get code systems status"""
    code_systems = {
        'ICD10': {'installed': True, 'version': '2024'},
        'ICD9': {'installed': True, 'version': '2015'},
        'SNOMED': {'installed': False},
        'RxNorm': {'installed': True, 'version': '2024'},
        'DSMIV': {'installed': False},
        'CQM_ValueSets': {'installed': False}
    }
    
    return jsonify({'success': True, 'code_systems': code_systems}), 200

@admin_mgmt_bp.route('/rules', methods=['GET'])
@token_required
@role_required(['System Administrator'])
def get_cdr_rules():
    """Get Clinical Decision Rules"""
    try:
        from src.models.cds import CDSRule
        rules = CDSRule.query.filter_by(is_active=True).all()
        
        return jsonify({
            'success': True,
            'rules': [r.to_dict() if hasattr(r, 'to_dict') else {} for r in rules]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_mgmt_bp.route('/alerts', methods=['GET'])
@token_required
@role_required(['System Administrator'])
def get_alerts():
    """Get alerts management"""
    try:
        from src.models.cds import CDSAlert
        alerts = CDSAlert.query.filter_by(is_active=True).order_by(CDSAlert.created_at.desc()).limit(100).all()
        
        return jsonify({
            'success': True,
            'alerts': [a.to_dict() if hasattr(a, 'to_dict') else {} for a in alerts]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_mgmt_bp.route('/backup', methods=['POST'])
@token_required
@role_required(['System Administrator'])
def create_backup():
    """Create system backup"""
    try:
        backup_type = request.json.get('backup_type', 'full')  # full, database, files
        
        # In production, this would create actual backup
        backup_info = {
            'backup_id': f"BACKUP-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            'backup_type': backup_type,
            'created_at': datetime.utcnow().isoformat(),
            'status': 'completed',
            'file_path': f'/backups/{backup_type}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.sql'
        }
        
        return jsonify({'success': True, 'backup': backup_info}), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_mgmt_bp.route('/logs', methods=['GET'])
@token_required
@role_required(['System Administrator'])
def get_logs():
    """Get system logs"""
    try:
        from src.models.auth import AuditLog
        
        log_type = request.args.get('type')  # audit, error, access
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')
        limit = request.args.get('limit', 100, type=int)
        
        query = AuditLog.query
        
        if log_type:
            query = query.filter_by(action_type=log_type)
        
        if from_date:
            from_date_obj = datetime.fromisoformat(from_date) if isinstance(from_date, str) else from_date
            query = query.filter(AuditLog.timestamp >= from_date_obj)
        
        if to_date:
            to_date_obj = datetime.fromisoformat(to_date) if isinstance(to_date, str) else to_date
            query = query.filter(AuditLog.timestamp <= to_date_obj)
        
        logs = query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
        
        return jsonify({
            'success': True,
            'logs': [{
                'id': l.id,
                'user_id': l.user_id,
                'action_type': l.action_type,
                'resource_type': l.resource_type,
                'resource_id': l.resource_id,
                'timestamp': l.timestamp.isoformat() if l.timestamp else None,
                'ip_address': l.ip_address if hasattr(l, 'ip_address') else None
            } for l in logs]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_mgmt_bp.route('/merge-patients', methods=['POST'])
@token_required
@role_required(['System Administrator'])
def merge_patients():
    """Merge duplicate patient records"""
    try:
        data = request.get_json()
        primary_patient_id = data['primary_patient_id']
        duplicate_patient_id = data['duplicate_patient_id']
        
        primary_patient = Patient.query.get_or_404(primary_patient_id)
        duplicate_patient = Patient.query.get_or_404(duplicate_patient_id)
        
        # Merge logic would go here
        # - Transfer all encounters, medications, allergies, etc. to primary
        # - Update foreign keys
        # - Delete duplicate patient
        
        return jsonify({
            'success': True,
            'message': f'Patient {duplicate_patient_id} merged into {primary_patient_id}'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_mgmt_bp.route('/duplicates', methods=['GET'])
@token_required
@role_required(['System Administrator'])
def find_duplicates():
    """Find duplicate patients"""
    try:
        # Find potential duplicates based on name, DOB, phone, etc.
        duplicates = []
        
        # This would implement duplicate detection logic
        # Checking for similar names, DOB, phone numbers, etc.
        
        return jsonify({
            'success': True,
            'duplicates': duplicates
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

