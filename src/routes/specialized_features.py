"""
Specialized Features Routes - Therapy groups, authorizations, patient portal, fax/scan, chart tracker
"""
from flask import Blueprint, request, jsonify
from src.models.patient import Patient
from src.models.user import db
from src.auth.jwt_manager import token_required, role_required
from datetime import datetime
import uuid
import json

specialized_bp = Blueprint('specialized', __name__)

# Therapy Groups
@specialized_bp.route('/therapy-groups', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_therapy_groups():
    """Get therapy groups"""
    try:
        groups = []
        
        return jsonify({
            'success': True,
            'groups': groups
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@specialized_bp.route('/therapy-groups', methods=['POST'])
@token_required
@role_required(['Physician', 'System Administrator'])
def create_therapy_group():
    """Create therapy group"""
    try:
        data = request.get_json()
        
        group = {
            'id': uuid.uuid4().hex,
            'name': data.get('name'),
            'description': data.get('description'),
            'created_at': datetime.utcnow().isoformat()
        }
        
        return jsonify({'success': True, 'group': group}), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Authorizations
@specialized_bp.route('/authorizations', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_authorizations():
    """Get authorizations"""
    try:
        patient_id = request.args.get('patient_id', type=int)
        
        authorizations = []
        
        return jsonify({
            'success': True,
            'authorizations': authorizations
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@specialized_bp.route('/authorizations', methods=['POST'])
@token_required
@role_required(['Physician', 'System Administrator'])
def create_authorization():
    """Create authorization"""
    try:
        data = request.get_json()
        
        authorization = {
            'id': uuid.uuid4().hex,
            'patient_id': data.get('patient_id'),
            'authorization_type': data.get('authorization_type'),
            'start_date': data.get('start_date'),
            'end_date': data.get('end_date'),
            'created_at': datetime.utcnow().isoformat()
        }
        
        return jsonify({'success': True, 'authorization': authorization}), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Patient Portal Management
@specialized_bp.route('/portal/patients', methods=['GET'])
@token_required
@role_required(['System Administrator', 'Receptionist', 'Facility Administrator'])
def get_portal_patients():
    """Get all patients with portal status"""
    try:
        patients = Patient.query.all()
        
        patient_list = []
        for patient in patients:
            # Check if patient has portal access
            portal_enabled = getattr(patient, 'allow_patient_portal', None) == 'YES'
            
            # Get portal username if exists
            portal_username = None
            if patient.user_account_id:
                from src.models.auth import UserAccount
                user_account = UserAccount.query.get(patient.user_account_id)
                if user_account and user_account.user_type == 'patient':
                    portal_username = user_account.username
            
            # Get last portal access
            from src.models.patient_portal import PortalAccessLog
            last_access = PortalAccessLog.query.filter_by(
                patient_id=patient.id
            ).order_by(PortalAccessLog.created_at.desc()).first()
            
            patient_list.append({
                'id': patient.id,
                'first_name': patient.first_name,
                'last_name': patient.last_name,
                'universal_patient_id': patient.universal_patient_id,
                'portal_enabled': portal_enabled,
                'portal_username': portal_username,
                'portal_last_access': last_access.created_at.isoformat() if last_access else None
            })
        
        return jsonify({
            'success': True,
            'patients': patient_list
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@specialized_bp.route('/portal/statistics', methods=['GET'])
@token_required
@role_required(['System Administrator', 'Facility Administrator'])
def get_portal_statistics():
    """Get portal usage statistics"""
    try:
        from src.models.patient_portal import PortalMessage, PortalAccessLog
        from src.models.auth import UserAccount
        from datetime import datetime, timedelta
        
        total_patients = Patient.query.count()
        portal_enabled = Patient.query.filter_by(allow_patient_portal='YES').count()
        
        # Active users in last 30 days
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        active_users = db.session.query(PortalAccessLog.patient_id).filter(
            PortalAccessLog.created_at >= thirty_days_ago
        ).distinct().count()
        
        # Messages sent
        messages_sent = PortalMessage.query.filter_by(message_type='patient_to_provider').count()
        
        return jsonify({
            'success': True,
            'statistics': {
                'total_patients': total_patients,
                'portal_enabled': portal_enabled,
                'active_users_30d': active_users,
                'messages_sent': messages_sent
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@specialized_bp.route('/portal/access-logs', methods=['GET'])
@token_required
@role_required(['System Administrator', 'Facility Administrator'])
def get_portal_access_logs():
    """Get portal access logs"""
    try:
        from src.models.patient_portal import PortalAccessLog
        
        logs = PortalAccessLog.query.order_by(
            PortalAccessLog.created_at.desc()
        ).limit(20).all()
        
        log_list = []
        for log in logs:
            patient = Patient.query.get(log.patient_id)
            log_list.append({
                'id': log.id,
                'patient_name': f"{patient.first_name} {patient.last_name}" if patient else 'Unknown',
                'action': log.access_type,
                'timestamp': log.created_at.isoformat() if log.created_at else None,
                'ip_address': log.ip_address,
                'success': True  # PortalAccessLog doesn't have success field, assume success
            })
        
        return jsonify({
            'success': True,
            'logs': log_list
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@specialized_bp.route('/portal/enable/<int:patient_id>', methods=['POST'])
@token_required
@role_required(['System Administrator', 'Receptionist'])
def enable_patient_portal(patient_id):
    """Enable patient portal access"""
    try:
        patient = Patient.query.get_or_404(patient_id)
        data = request.get_json()
        
        patient.allow_patient_portal = 'YES'
        
        # Create portal login if needed
        if data.get('create_login'):
            from src.models.auth import UserAccount
            import secrets
            
            # Check if user account exists
            if not patient.user_account_id:
                # Create user account
                username = f"{patient.first_name.lower()}.{patient.last_name.lower()}.{patient.id}"
                temp_password = secrets.token_urlsafe(8)
                
                user_account = UserAccount(
                    username=username,
                    email=patient.email or f"{username}@portal.local",
                    user_type='patient',
                    is_active=True
                )
                user_account.set_password(temp_password)
                db.session.add(user_account)
                db.session.flush()
                
                patient.user_account_id = user_account.id
            else:
                user_account = UserAccount.query.get(patient.user_account_id)
                temp_password = secrets.token_urlsafe(8)
                user_account.set_password(temp_password)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Patient portal enabled',
            'username': user_account.username if data.get('create_login') else None,
            'temporary_password': temp_password if data.get('create_login') else None
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@specialized_bp.route('/portal/disable/<int:patient_id>', methods=['POST'])
@token_required
@role_required(['System Administrator', 'Receptionist'])
def disable_patient_portal(patient_id):
    """Disable patient portal access"""
    try:
        patient = Patient.query.get_or_404(patient_id)
        patient.allow_patient_portal = 'NO'
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Patient portal disabled'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@specialized_bp.route('/portal/create-login/<int:patient_id>', methods=['POST'])
@token_required
@role_required(['System Administrator', 'Receptionist'])
def create_portal_login(patient_id):
    """Create portal login for patient"""
    try:
        patient = Patient.query.get_or_404(patient_id)
        from src.models.auth import UserAccount
        import secrets
        
        if patient.user_account_id:
            return jsonify({'error': 'Patient already has a user account'}), 400
        
        username = f"{patient.first_name.lower()}.{patient.last_name.lower()}.{patient.id}"
        temp_password = secrets.token_urlsafe(8)
        
        user_account = UserAccount(
            username=username,
            email=patient.email or f"{username}@portal.local",
            user_type='patient',
            is_active=True
        )
        user_account.set_password(temp_password)
        db.session.add(user_account)
        db.session.flush()
        
        patient.user_account_id = user_account.id
        patient.allow_patient_portal = 'YES'
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'username': username,
            'temporary_password': temp_password,
            'message': 'Portal login created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@specialized_bp.route('/portal/reset-password/<int:patient_id>', methods=['POST'])
@token_required
@role_required(['System Administrator', 'Receptionist'])
def reset_portal_password(patient_id):
    """Reset portal password for patient"""
    try:
        patient = Patient.query.get_or_404(patient_id)
        
        if not patient.user_account_id:
            return jsonify({'error': 'Patient does not have a portal account'}), 400
        
        from src.models.auth import UserAccount
        import secrets
        
        user_account = UserAccount.query.get(patient.user_account_id)
        temp_password = secrets.token_urlsafe(8)
        user_account.set_password(temp_password)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'temporary_password': temp_password,
            'message': 'Password reset successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@specialized_bp.route('/portal/settings', methods=['GET'])
@token_required
@role_required(['System Administrator'])
def get_portal_settings():
    """Get portal settings"""
    try:
        from src.routes.settings import SYSTEM_SETTINGS
        
        # Get portal settings from SYSTEM_SETTINGS or use defaults
        portal_settings = SYSTEM_SETTINGS.get('patient_portal', {
            'allow_registration': True,
            'require_email_verification': True,
            'allow_document_upload': True,
            'allow_message_sending': True,
            'allow_appointment_booking': True,
            'allow_prescription_refills': True
        })
        
        return jsonify({
            'success': True,
            'settings': portal_settings
        }), 200
        
    except Exception as e:
        # Return defaults if error
        return jsonify({
            'success': True,
            'settings': {
                'allow_registration': True,
                'require_email_verification': True,
                'allow_document_upload': True,
                'allow_message_sending': True,
                'allow_appointment_booking': True,
                'allow_prescription_refills': True
            }
        }), 200

@specialized_bp.route('/portal/settings', methods=['PUT'])
@token_required
@role_required(['System Administrator'])
def update_portal_settings():
    """Update portal settings"""
    try:
        data = request.get_json()
        from src.routes.settings import SYSTEM_SETTINGS
        
        # Initialize patient_portal category if it doesn't exist
        if 'patient_portal' not in SYSTEM_SETTINGS:
            SYSTEM_SETTINGS['patient_portal'] = {}
        
        # Update settings
        SYSTEM_SETTINGS['patient_portal'].update(data)
        
        return jsonify({
            'success': True,
            'settings': SYSTEM_SETTINGS['patient_portal'],
            'message': 'Portal settings updated successfully'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Fax/Scan
@specialized_bp.route('/fax/queue', methods=['GET'])
@token_required
@role_required(['Receptionist', 'System Administrator', 'Physician', 'Nurse', 'Facility Administrator'])
def get_fax_queue():
    """Get fax queue"""
    try:
        queue = []
        
        return jsonify({
            'success': True,
            'queue': queue
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@specialized_bp.route('/fax/send', methods=['POST'])
@token_required
@role_required(['Receptionist', 'System Administrator'])
def send_fax():
    """Send fax"""
    try:
        data = request.get_json()
        
        fax_job = {
            'id': uuid.uuid4().hex,
            'to_number': data.get('to_number'),
            'document_id': data.get('document_id'),
            'status': 'pending',
            'created_at': datetime.utcnow().isoformat()
        }
        
        return jsonify({'success': True, 'fax_job': fax_job}), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Chart Tracker
@specialized_bp.route('/chart-tracker', methods=['GET'])
@token_required
@role_required(['Receptionist', 'System Administrator', 'Physician', 'Nurse', 'Facility Administrator'])
def get_chart_tracker():
    """Get chart tracker"""
    try:
        facility_id = request.args.get('facility_id', type=int)
        
        charts = []
        
        return jsonify({
            'success': True,
            'charts': charts
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@specialized_bp.route('/chart-tracker/checkout', methods=['POST'])
@token_required
@role_required(['Receptionist', 'System Administrator'])
def checkout_chart():
    """Check out a chart"""
    try:
        data = request.get_json()
        patient_id = data['patient_id']
        
        checkout_record = {
            'id': uuid.uuid4().hex,
            'patient_id': patient_id,
            'checked_out_by': request.current_user.id if hasattr(request, 'current_user') else None,
            'checked_out_at': datetime.utcnow().isoformat(),
            'location': data.get('location')
        }
        
        return jsonify({'success': True, 'checkout': checkout_record}), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

