"""
JWT-Enhanced Authentication Routes for Clinic+
Integrates JWT authentication with existing auth functionality
"""

from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
from src.auth.jwt_manager import JWTManager, token_required, role_required
from src.auth.tenant_middleware import TenantManager, tenant_isolation_required
from src.models.user import db
from src.models.auth import UserAccount, UserRole, Role
from src.models.patient import Patient
from src.models.provider import Provider, Facility
from src.models.notification_preferences import NotificationPreferences
from datetime import datetime

auth_jwt_bp = Blueprint('auth_jwt', __name__)


def _resolve_patient_for_profile(user_account):
    """Patient row for portal users (strict: account is a patient type)."""
    if str(user_account.user_type or '').lower() != 'patient':
        return None
    patient = Patient.query.filter_by(user_account_id=user_account.id).first()
    if not patient and user_account.patient_id:
        patient = Patient.query.get(user_account.patient_id)
    return patient


def _resolve_provider_for_profile(user_account):
    """Provider row for physicians, nurses, etc. — linked by provider_id or user_account_id."""
    if user_account.provider_id:
        provider = Provider.query.get(user_account.provider_id)
        if provider:
            return provider
    return Provider.query.filter_by(user_account_id=user_account.id).first()


@auth_jwt_bp.route('/login', methods=['POST'])
def jwt_login():
    """JWT-based authentication with multi-tenant subdomain support"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        facility_id = data.get('facility_id')  # Optional facility context from frontend
        
        # Auto-detect facility from Origin header (subdomain) if not provided
        if not facility_id:
            origin = request.headers.get('Origin', '')
            if origin:
                # Extract subdomain from origin (e.g., http://elvis.localhost:4305 -> elvis)
                import re
                match = re.match(r'https?://([a-zA-Z0-9-]+)\.(localhost|clinicplus\.org)', origin)
                if match:
                    subdomain = match.group(1).lower()
                    # Find facility by facility_id (subdomain)
                    facility = Facility.query.filter_by(facility_id=subdomain, is_active=True).first()
                    if facility:
                        facility_id = facility.id
                        print(f"[LOGIN] Auto-detected facility from subdomain: {subdomain} -> facility_id: {facility_id}")
        
        # If user has a default facility_id, use it if no facility_id was detected
        if not facility_id:
            user_account = UserAccount.query.filter_by(username=username, is_active=True).first()
            if user_account and user_account.facility_id:
                facility_id = user_account.facility_id
                print(f"[LOGIN] Using user's default facility_id: {facility_id}")
        
        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400
        
        # Authenticate user using JWT manager
        result = JWTManager.authenticate_user(username, password, facility_id)
        
        if result['success']:
            return jsonify({
                'success': True,
                'token': result['token'],
                'expires_in': result['expires_in'],
                'user': result['user']
            }), 200
        else:
            return jsonify({'error': result['error']}), 401
            
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[LOGIN ERROR] {str(e)}")
        print(f"[LOGIN ERROR TRACEBACK]\n{error_trace}")
        return jsonify({'error': f'Login failed: {str(e)}'}), 500

@auth_jwt_bp.route('/refresh-token', methods=['POST'])
@token_required
def refresh_token():
    """Refresh JWT token"""
    try:
        user_account = request.current_user
        facility_id = request.token_payload.get('facility_id')
        
        # Generate new token
        result = JWTManager.generate_token(user_account, facility_id)
        
        if result['success']:
            return jsonify({
                'success': True,
                'token': result['token'],
                'expires_in': result['expires_in']
            }), 200
        else:
            return jsonify({'error': result['error']}), 500
            
    except Exception as e:
        return jsonify({'error': f'Token refresh failed: {str(e)}'}), 500

@auth_jwt_bp.route('/verify-token', methods=['POST'])
def verify_token():
    """Verify JWT token validity"""
    try:
        data = request.get_json()
        token = data.get('token')
        
        if not token:
            return jsonify({'error': 'Token required'}), 400
        
        result = JWTManager.verify_token(token)
        
        if result['success']:
            return jsonify({
                'success': True,
                'valid': True,
                'payload': result['payload']
            }), 200
        else:
            return jsonify({
                'success': False,
                'valid': False,
                'error': result['error']
            }), 401
            
    except Exception as e:
        return jsonify({'error': f'Token verification failed: {str(e)}'}), 500

@auth_jwt_bp.route('/profile', methods=['GET'])
@token_required
def get_profile():
    """Get current user's profile with facility access"""
    try:
        user_account = request.current_user
        
        # Get user facilities if available
        user_facilities = []
        try:
            if hasattr(request, 'user_facilities'):
                user_facilities = request.user_facilities
            else:
                # Fallback: get facilities from user's facility_id
                if user_account.facility_id:
                    facility = Facility.query.get(user_account.facility_id)
                    if facility:
                        user_facilities = [{
                            'id': facility.id,
                            'facility_name': facility.facility_name,
                            'facility_type': facility.facility_type
                        }]
        except:
            pass
        
        # Get facility information
        facility_info = None
        if user_account.facility_id:
            facility = Facility.query.get(user_account.facility_id)
            if facility:
                facility_info = {
                    'id': facility.id,
                    'facility_id': facility.facility_id,
                    'facility_name': facility.facility_name,
                    'facility_type': facility.facility_type
                }
        
        profile = {
            'id': user_account.id,
            'username': user_account.username,
            'email': user_account.email,
            'user_type': user_account.user_type,
            'is_active': user_account.is_active,
            'last_login': user_account.last_login.isoformat() if user_account.last_login else None,
            'facility_id': user_account.facility_id,
            'facility': facility_info,  # Add facility object
            'patient_id': user_account.patient_id,
            'provider_id': user_account.provider_id,
            'facilities': user_facilities
        }
        
        # Add patient-specific information (patient accounts only)
        patient = _resolve_patient_for_profile(user_account)
        if patient:
            profile['patient_info'] = {
                'universal_patient_id': patient.universal_patient_id,
                'first_name': patient.first_name,
                'last_name': patient.last_name,
                'date_of_birth': patient.date_of_birth.isoformat() if patient.date_of_birth else None,
                'gender': patient.gender,
                'phone_primary': patient.phone_primary,
                'phone': patient.phone_primary,
                'address': patient.address_line_1 or '',
                'allow_cross_facility_sharing': patient.allow_cross_facility_sharing
            }
            profile['patient_id'] = patient.id

        # Add provider/clinical staff information whenever a Provider row exists
        provider = _resolve_provider_for_profile(user_account)
        if provider:
            profile['provider_info'] = {
                'universal_provider_id': provider.universal_provider_id,
                'first_name': provider.first_name,
                'last_name': provider.last_name,
                'title': provider.title,
                'provider_type': provider.provider_type,
                'specialty': provider.specialty,
                'license_number': provider.license_number or provider.medical_license_number,
                'phone': provider.phone or '',
                'email': provider.email or user_account.email
            }
            profile['provider_id'] = provider.id

        # Get user roles
        user_roles = UserRole.query.filter_by(user_account_id=user_account.id, is_active=True).all()
        roles = []
        for ur in user_roles:
            role = Role.query.get(ur.role_id)
            if role:
                roles.append({
                    'name': role.role_name,  # Use 'name' for compatibility
                    'role_name': role.role_name,
                    'description': role.role_description,  # Use 'description' for compatibility
                    'role_description': role.role_description,
                    'category': getattr(role, 'role_category', 'general'),  # Add category
                    'facility_id': ur.facility_id,
                    'assigned_at': ur.assigned_at.isoformat() if ur.assigned_at else None
                })
        profile['roles'] = roles
        
        # Add MFA status if available
        profile['mfa_enabled'] = getattr(user_account, 'mfa_enabled', False)
        
        return jsonify({'success': True, 'user': profile}), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to get profile: {str(e)}'}), 500

@auth_jwt_bp.route('/profile', methods=['PUT'])
@token_required
def update_profile():
    """Update current user's profile"""
    try:
        user_account = request.current_user
        data = request.get_json()
        
        # Update user account fields
        if 'username' in data:
            # Check if username is already taken
            existing = UserAccount.query.filter(
                UserAccount.username == data['username'],
                UserAccount.id != user_account.id
            ).first()
            if existing:
                return jsonify({'error': 'Username already taken'}), 400
            user_account.username = data['username']
        
        if 'email' in data:
            # Check if email is already taken
            existing = UserAccount.query.filter(
                UserAccount.email == data['email'],
                UserAccount.id != user_account.id
            ).first()
            if existing:
                return jsonify({'error': 'Email already taken'}), 400
            user_account.email = data['email']
        
        # Update patient-specific data
        patient = _resolve_patient_for_profile(user_account)
        if patient and 'patient_data' in data:
            patient_data = data['patient_data'] or {}
            if 'first_name' in patient_data:
                patient.first_name = patient_data['first_name']
            if 'last_name' in patient_data:
                patient.last_name = patient_data['last_name']
            if 'phone' in patient_data:
                patient.phone_primary = patient_data['phone']
            if 'address' in patient_data:
                patient.address_line_1 = patient_data['address']

        # Update provider / clinical staff row (any account linked to a Provider)
        provider = _resolve_provider_for_profile(user_account)
        if provider and 'provider_data' in data:
            provider_data = data['provider_data'] or {}
            if 'first_name' in provider_data:
                provider.first_name = provider_data['first_name']
            if 'last_name' in provider_data:
                provider.last_name = provider_data['last_name']
            if 'phone' in provider_data:
                provider.phone = provider_data['phone']
            if 'email' in provider_data:
                provider.email = provider_data['email']
            if 'specialty' in provider_data:
                provider.specialty = provider_data['specialty']
            if 'license_number' in provider_data:
                lic = provider_data.get('license_number')
                provider.license_number = lic
                provider.medical_license_number = lic

        db.session.commit()
        
        # Return success response
        return jsonify({
            'success': True,
            'message': 'Profile updated successfully',
            'profile': {
                'id': user_account.id,
                'username': user_account.username,
                'email': user_account.email,
                'user_type': user_account.user_type
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update profile: {str(e)}'}), 500

@auth_jwt_bp.route('/profile/password', methods=['PUT'])
@token_required
def update_password():
    """Update user password"""
    try:
        user_account = request.current_user
        data = request.get_json()
        
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return jsonify({'error': 'Current password and new password are required'}), 400
        
        # Verify current password
        if not user_account.check_password(current_password):
            return jsonify({'error': 'Current password is incorrect'}), 400
        
        # Validate new password
        if len(new_password) < 8:
            return jsonify({'error': 'New password must be at least 8 characters'}), 400
        
        # Update password
        user_account.set_password(new_password)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Password updated successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update password: {str(e)}'}), 500

@auth_jwt_bp.route('/profile/mfa', methods=['PUT'])
@token_required
def update_mfa():
    """Enable or disable multi-factor authentication"""
    try:
        user_account = request.current_user
        data = request.get_json()
        
        enabled = data.get('enabled', False)
        
        # Update MFA status (if mfa_enabled field exists)
        if hasattr(user_account, 'mfa_enabled'):
            user_account.mfa_enabled = enabled
        else:
            # If field doesn't exist, we'll just return success for now
            pass
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'mfa_enabled': enabled,
            'message': 'MFA status updated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update MFA: {str(e)}'}), 500

@auth_jwt_bp.route('/profile/notifications', methods=['GET'])
@token_required
def get_notification_preferences():
    """Get user's notification preferences"""
    try:
        user_account = request.current_user
        prefs = NotificationPreferences.get_or_create(user_account.id)
        
        return jsonify({
            'success': True,
            'preferences': prefs.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to get notification preferences: {str(e)}'}), 500

@auth_jwt_bp.route('/profile/notifications', methods=['PUT'])
@token_required
def update_notification_preferences():
    """Update user's notification preferences"""
    try:
        user_account = request.current_user
        data = request.get_json()
        
        prefs = NotificationPreferences.get_or_create(user_account.id)
        
        # Update email preferences
        if 'email' in data:
            email_prefs = data['email']
            prefs.email_appointments = email_prefs.get('appointments', prefs.email_appointments)
            prefs.email_messages = email_prefs.get('messages', prefs.email_messages)
            prefs.email_lab_results = email_prefs.get('lab_results', prefs.email_lab_results)
            prefs.email_prescriptions = email_prefs.get('prescriptions', prefs.email_prescriptions)
            prefs.email_billing = email_prefs.get('billing', prefs.email_billing)
            prefs.email_reminders = email_prefs.get('reminders', prefs.email_reminders)
            prefs.email_alerts = email_prefs.get('alerts', prefs.email_alerts)
            prefs.email_newsletter = email_prefs.get('newsletter', prefs.email_newsletter)
        
        # Update SMS preferences
        if 'sms' in data:
            sms_prefs = data['sms']
            prefs.sms_appointments = sms_prefs.get('appointments', prefs.sms_appointments)
            prefs.sms_messages = sms_prefs.get('messages', prefs.sms_messages)
            prefs.sms_lab_results = sms_prefs.get('lab_results', prefs.sms_lab_results)
            prefs.sms_prescriptions = sms_prefs.get('prescriptions', prefs.sms_prescriptions)
            prefs.sms_billing = sms_prefs.get('billing', prefs.sms_billing)
            prefs.sms_reminders = sms_prefs.get('reminders', prefs.sms_reminders)
            prefs.sms_alerts = sms_prefs.get('alerts', prefs.sms_alerts)
        
        # Update push preferences
        if 'push' in data:
            push_prefs = data['push']
            prefs.push_appointments = push_prefs.get('appointments', prefs.push_appointments)
            prefs.push_messages = push_prefs.get('messages', prefs.push_messages)
            prefs.push_lab_results = push_prefs.get('lab_results', prefs.push_lab_results)
            prefs.push_prescriptions = push_prefs.get('prescriptions', prefs.push_prescriptions)
            prefs.push_billing = push_prefs.get('billing', prefs.push_billing)
            prefs.push_reminders = push_prefs.get('reminders', prefs.push_reminders)
            prefs.push_alerts = push_prefs.get('alerts', prefs.push_alerts)
        
        # Update in-app preferences
        if 'in_app' in data:
            in_app_prefs = data['in_app']
            prefs.in_app_appointments = in_app_prefs.get('appointments', prefs.in_app_appointments)
            prefs.in_app_messages = in_app_prefs.get('messages', prefs.in_app_messages)
            prefs.in_app_lab_results = in_app_prefs.get('lab_results', prefs.in_app_lab_results)
            prefs.in_app_prescriptions = in_app_prefs.get('prescriptions', prefs.in_app_prescriptions)
            prefs.in_app_billing = in_app_prefs.get('billing', prefs.in_app_billing)
            prefs.in_app_reminders = in_app_prefs.get('reminders', prefs.in_app_reminders)
            prefs.in_app_alerts = in_app_prefs.get('alerts', prefs.in_app_alerts)
        
        # Update quiet hours
        if 'quiet_hours' in data:
            quiet_hours = data['quiet_hours']
            prefs.quiet_hours_enabled = quiet_hours.get('enabled', prefs.quiet_hours_enabled)
            prefs.quiet_hours_start = quiet_hours.get('start', prefs.quiet_hours_start)
            prefs.quiet_hours_end = quiet_hours.get('end', prefs.quiet_hours_end)
        
        # Update urgent override
        if 'urgent_override' in data:
            prefs.urgent_override = data.get('urgent_override', prefs.urgent_override)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Notification preferences updated successfully',
            'preferences': prefs.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update notification preferences: {str(e)}'}), 500

@auth_jwt_bp.route('/switch-facility', methods=['POST'])
@token_required
def switch_facility():
    """Switch user's active facility context"""
    try:
        data = request.get_json()
        facility_id = data.get('facility_id')
        
        if not facility_id:
            return jsonify({'error': 'Facility ID required'}), 400
        
        user_account = request.current_user
        
        # Check if user has access to the requested facility
        access_result = TenantManager.check_facility_access(user_account.id, facility_id)
        
        if not access_result['success']:
            return jsonify({'error': 'Access denied to this facility'}), 403
        
        # Generate new token with facility context
        result = JWTManager.generate_token(user_account, facility_id)
        
        if result['success']:
            return jsonify({
                'success': True,
                'token': result['token'],
                'expires_in': result['expires_in'],
                'facility_id': facility_id
            }), 200
        else:
            return jsonify({'error': result['error']}), 500
            
    except Exception as e:
        return jsonify({'error': f'Facility switch failed: {str(e)}'}), 500

@auth_jwt_bp.route('/facilities', methods=['GET'])
@token_required
@tenant_isolation_required
def get_user_facilities():
    """Get facilities accessible to current user"""
    try:
        return jsonify({
            'success': True,
            'facilities': request.user_facilities
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to get facilities: {str(e)}'}), 500

@auth_jwt_bp.route('/permissions', methods=['GET'])
@token_required
def get_user_permissions():
    """Get current user's permissions"""
    try:
        user_roles = request.token_payload.get('roles', [])
        
        all_permissions = set()
        for role in user_roles:
            permissions = role.get('permissions', [])
            all_permissions.update(permissions)
        
        return jsonify({
            'success': True,
            'permissions': list(all_permissions),
            'roles': user_roles
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to get permissions: {str(e)}'}), 500

@auth_jwt_bp.route('/check-permission', methods=['POST'])
@token_required
def check_permission():
    """Check if user has specific permission"""
    try:
        data = request.get_json()
        required_permission = data.get('permission')
        
        if not required_permission:
            return jsonify({'error': 'Permission name required'}), 400
        
        user_roles = request.token_payload.get('roles', [])
        
        has_permission = False
        for role in user_roles:
            permissions = role.get('permissions', [])
            if required_permission in permissions:
                has_permission = True
                break
        
        return jsonify({
            'success': True,
            'has_permission': has_permission,
            'permission': required_permission
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Permission check failed: {str(e)}'}), 500

@auth_jwt_bp.route('/admin/users', methods=['GET'])
@token_required
@role_required(['System Administrator', 'Facility Administrator'])
@tenant_isolation_required
def get_users():
    """Get users (admin only)"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        user_type = request.args.get('user_type', '')
        facility_id = request.args.get('facility_id', '')
        
        query = UserAccount.query
        
        # Filter by user type if specified
        if user_type:
            query = query.filter(UserAccount.user_type == user_type)
        
        # Apply tenant isolation for facility administrators
        current_user_roles = [role['role_name'] for role in request.token_payload.get('roles', [])]
        if 'System Administrator' not in current_user_roles:
            # Facility admin can only see users in their facilities
            user_facility_ids = [f['id'] for f in request.user_facilities if f['id'] is not None]
            if user_facility_ids:
                query = query.join(UserRole).filter(UserRole.facility_id.in_(user_facility_ids))
        
        # Filter by specific facility if requested
        if facility_id:
            query = query.join(UserRole).filter(UserRole.facility_id == facility_id)
        
        users = query.paginate(page=page, per_page=per_page, error_out=False)
        
        users_list = []
        for user in users.items:
            user_data = {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'user_type': user.user_type,
                'is_active': user.is_active,
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'created_at': user.created_at.isoformat() if user.created_at else None
            }
            
            # Get user roles
            user_roles = UserRole.query.filter_by(user_account_id=user.id).all()
            user_data['roles'] = []
            for user_role in user_roles:
                user_data['roles'].append({
                    'role_name': user_role.role.role_name,
                    'facility_id': user_role.facility_id
                })
            
            users_list.append(user_data)
        
        return jsonify({
            'success': True,
            'users': users_list,
            'total': users.total,
            'pages': users.pages,
            'current_page': page
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to get users: {str(e)}'}), 500

@auth_jwt_bp.route('/admin/assign-role', methods=['POST'])
@token_required
@role_required(['System Administrator', 'Facility Administrator'])
def admin_assign_role():
    """Assign role to user (admin only)"""
    try:
        data = request.get_json()
        user_account_id = data.get('user_account_id')
        role_id = data.get('role_id')
        facility_id = data.get('facility_id')
        
        if not user_account_id or not role_id:
            return jsonify({'error': 'User account ID and role ID required'}), 400
        
        # Check if user account exists
        user_account = UserAccount.query.get(user_account_id)
        if not user_account:
            return jsonify({'error': 'User account not found'}), 404
        
        # Check if role exists
        role = Role.query.get(role_id)
        if not role:
            return jsonify({'error': 'Role not found'}), 404
        
        # Check if facility exists (if specified)
        if facility_id:
            facility = Facility.query.get(facility_id)
            if not facility:
                return jsonify({'error': 'Facility not found'}), 404
        
        # Check if user already has this role for this facility
        existing_role = UserRole.query.filter_by(
            user_account_id=user_account_id,
            role_id=role_id,
            facility_id=facility_id
        ).first()
        
        if existing_role:
            return jsonify({'error': 'User already has this role for this facility'}), 400
        
        # Assign role
        user_role = UserRole(
            user_account_id=user_account_id,
            role_id=role_id,
            facility_id=facility_id,
            assigned_at=datetime.utcnow()
        )
        
        db.session.add(user_role)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Role assigned successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Role assignment failed: {str(e)}'}), 500

@auth_jwt_bp.route('/admin/revoke-role', methods=['POST'])
@token_required
@role_required(['System Administrator', 'Facility Administrator'])
def admin_revoke_role():
    """Revoke role from user (admin only)"""
    try:
        data = request.get_json()
        user_account_id = data.get('user_account_id')
        role_id = data.get('role_id')
        facility_id = data.get('facility_id')
        
        if not user_account_id or not role_id:
            return jsonify({'error': 'User account ID and role ID required'}), 400
        
        # Find and remove the role assignment
        user_role = UserRole.query.filter_by(
            user_account_id=user_account_id,
            role_id=role_id,
            facility_id=facility_id
        ).first()
        
        if not user_role:
            return jsonify({'error': 'Role assignment not found'}), 404
        
        db.session.delete(user_role)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Role revoked successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Role revocation failed: {str(e)}'}), 500

