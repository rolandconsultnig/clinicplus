"""
JWT-Enhanced Authentication Routes for MedConnect
Integrates JWT authentication with existing auth functionality
"""

from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
from auth.jwt_manager import JWTManager, token_required, role_required
from auth.tenant_middleware import TenantManager, tenant_isolation_required
from models.auth import UserAccount, UserRole, Role
from models.patient import Patient
from models.provider import Provider, Facility
from database import db
import datetime

auth_jwt_bp = Blueprint('auth_jwt', __name__)

@auth_jwt_bp.route('/login', methods=['POST'])
def jwt_login():
    """JWT-based authentication"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        facility_id = data.get('facility_id')  # Optional facility context
        
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
@tenant_isolation_required
def get_profile():
    """Get current user's profile with facility access"""
    try:
        user_account = request.current_user
        
        profile = {
            'id': user_account.id,
            'username': user_account.username,
            'email': user_account.email,
            'user_type': user_account.user_type,
            'is_active': user_account.is_active,
            'last_login': user_account.last_login.isoformat() if user_account.last_login else None,
            'facilities': request.user_facilities
        }
        
        # Add patient or provider specific information
        if user_account.user_type == 'patient':
            patient = Patient.query.filter_by(user_account_id=user_account.id).first()
            if patient:
                profile['patient_info'] = {
                    'universal_patient_id': patient.universal_patient_id,
                    'first_name': patient.first_name,
                    'last_name': patient.last_name,
                    'date_of_birth': patient.date_of_birth.isoformat() if patient.date_of_birth else None,
                    'gender': patient.gender,
                    'phone_primary': patient.phone_primary,
                    'allow_cross_facility_sharing': patient.allow_cross_facility_sharing
                }
        
        elif user_account.user_type == 'provider':
            provider = Provider.query.filter_by(user_account_id=user_account.id).first()
            if provider:
                profile['provider_info'] = {
                    'universal_provider_id': provider.universal_provider_id,
                    'first_name': provider.first_name,
                    'last_name': provider.last_name,
                    'title': provider.title,
                    'provider_type': provider.provider_type,
                    'specialty': provider.specialty,
                    'license_number': provider.license_number
                }
        
        return jsonify({'success': True, 'profile': profile}), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to get profile: {str(e)}'}), 500

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
            assigned_at=datetime.datetime.utcnow()
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

