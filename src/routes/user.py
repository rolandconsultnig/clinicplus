"""
User Management Routes
Complete CRUD operations for user management
"""

from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.auth import UserAccount, Role, UserRole, Permission, RolePermission
from datetime import datetime
import re

user_bp = Blueprint('user', __name__)

@user_bp.route('/users', methods=['GET'])
@token_required
@role_required(['admin', 'System Administrator', 'Facility Administrator'])
def get_users():
    """Get users with filtering"""
    try:
        user_type = request.args.get('user_type')
        is_active = request.args.get('is_active', type=bool)
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        query = UserAccount.query
        
        if user_type:
            query = query.filter(UserAccount.user_type == user_type)
        if is_active is not None:
            query = query.filter(UserAccount.is_active == is_active)
        
        # Paginate
        users = query.paginate(page=page, per_page=per_page, error_out=False)
        
        users_list = []
        for user in users.items:
            user_dict = user.to_dict()
            # Get user roles
            user_roles = UserRole.query.filter_by(user_account_id=user.id, is_active=True).all()
            user_dict['roles'] = []
            for ur in user_roles:
                role = Role.query.get(ur.role_id)
                if role:
                    user_dict['roles'].append({
                        'id': role.id,
                        'role_name': role.role_name,
                        'facility_id': ur.facility_id
                    })
            users_list.append(user_dict)
        
        return jsonify({
            'success': True,
            'users': users_list,
            'total': users.total,
            'page': page,
            'per_page': per_page,
            'pages': users.pages
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_bp.route('/users/<int:user_id>', methods=['GET'])
@token_required
@role_required(['admin', 'System Administrator', 'Facility Administrator'])
def get_user(user_id):
    """Get user details with roles"""
    try:
        user = UserAccount.query.get_or_404(user_id)
        user_dict = user.to_dict()
        
        # Get user roles
        user_roles = UserRole.query.filter_by(user_account_id=user.id, is_active=True).all()
        user_dict['roles'] = []
        for ur in user_roles:
            role = Role.query.get(ur.role_id)
            if role:
                user_dict['roles'].append({
                    'id': role.id,
                    'role_name': role.role_name,
                    'role_description': role.role_description,
                    'facility_id': ur.facility_id
                })
        
        return jsonify({
            'success': True,
            'user': user_dict
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_bp.route('/users', methods=['POST'])
@token_required
@role_required(['admin', 'System Administrator'])
def create_user():
    """Create a new user"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('username') or not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Username, email, and password are required'}), 400
        
        # Validate email format
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, data.get('email')):
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Check if username or email already exists
        if UserAccount.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Username already exists'}), 400
        if UserAccount.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already exists'}), 400
        
        # Create user
        user = UserAccount(
            username=data['username'],
            email=data['email'],
            user_type=data.get('user_type', 'patient'),
            patient_id=data.get('patient_id'),
            provider_id=data.get('provider_id'),
            facility_id=data.get('facility_id'),
            is_active=data.get('is_active', True),
            is_verified=data.get('is_verified', False),
            mfa_enabled=data.get('mfa_enabled', False)
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'user': user.to_dict(),
            'message': 'User created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@user_bp.route('/users/<int:user_id>', methods=['PUT'])
@token_required
@role_required(['admin', 'System Administrator'])
def update_user(user_id):
    """Update user information"""
    try:
        user = UserAccount.query.get_or_404(user_id)
        data = request.get_json()
        
        # Update fields
        if 'email' in data:
            # Validate email format
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_pattern, data['email']):
                return jsonify({'error': 'Invalid email format'}), 400
            # Check if email is already taken by another user
            existing = UserAccount.query.filter_by(email=data['email']).first()
            if existing and existing.id != user_id:
                return jsonify({'error': 'Email already exists'}), 400
            user.email = data['email']
        
        if 'username' in data:
            # Check if username is already taken by another user
            existing = UserAccount.query.filter_by(username=data['username']).first()
            if existing and existing.id != user_id:
                return jsonify({'error': 'Username already exists'}), 400
            user.username = data['username']
        
        if 'user_type' in data:
            user.user_type = data['user_type']
        
        if 'patient_id' in data:
            user.patient_id = data['patient_id']
        
        if 'provider_id' in data:
            user.provider_id = data['provider_id']
        
        if 'facility_id' in data:
            user.facility_id = data['facility_id']
        
        if 'is_active' in data:
            user.is_active = data['is_active']
        
        if 'is_verified' in data:
            user.is_verified = data['is_verified']
        
        if 'mfa_enabled' in data:
            user.mfa_enabled = data['mfa_enabled']
        
        if 'password' in data and data['password']:
            user.set_password(data['password'])
        
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'user': user.to_dict(),
            'message': 'User updated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@user_bp.route('/users/<int:user_id>', methods=['DELETE'])
@token_required
@role_required(['admin', 'System Administrator'])
def delete_user(user_id):
    """Delete a user (soft delete by deactivating)"""
    try:
        user = UserAccount.query.get_or_404(user_id)
        
        # Prevent deleting yourself
        if user.id == request.current_user.id:
            return jsonify({'error': 'Cannot delete your own account'}), 400
        
        # Soft delete by deactivating
        user.is_active = False
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'User deactivated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@user_bp.route('/users/<int:user_id>/toggle-active', methods=['POST'])
@token_required
@role_required(['admin', 'System Administrator'])
def toggle_user_active(user_id):
    """Toggle user active status"""
    try:
        user = UserAccount.query.get_or_404(user_id)
        
        # Prevent deactivating yourself
        if user.id == request.current_user.id:
            return jsonify({'error': 'Cannot deactivate your own account'}), 400
        
        user.is_active = not user.is_active
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'user': user.to_dict(),
            'message': f'User {"activated" if user.is_active else "deactivated"} successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@user_bp.route('/users/<int:user_id>/reset-password', methods=['POST'])
@token_required
@role_required(['admin', 'System Administrator'])
def reset_user_password(user_id):
    """Reset user password"""
    try:
        user = UserAccount.query.get_or_404(user_id)
        data = request.get_json()
        
        if not data.get('new_password'):
            return jsonify({'error': 'New password is required'}), 400
        
        if len(data['new_password']) < 8:
            return jsonify({'error': 'Password must be at least 8 characters'}), 400
        
        user.set_password(data['new_password'])
        user.must_change_password = data.get('must_change_password', False)
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Password reset successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@user_bp.route('/roles', methods=['GET'])
@token_required
@role_required(['admin', 'System Administrator'])
def get_roles():
    """Get all roles"""
    try:
        roles = Role.query.filter_by(is_active=True).all()
        return jsonify({
            'success': True,
            'roles': [r.to_dict() for r in roles]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_bp.route('/users/<int:user_id>/roles', methods=['POST'])
@token_required
@role_required(['admin', 'System Administrator'])
def assign_role(user_id):
    """Assign role to user"""
    try:
        user = UserAccount.query.get_or_404(user_id)
        data = request.get_json()
        
        role_id = data.get('role_id')
        facility_id = data.get('facility_id')
        
        if not role_id:
            return jsonify({'error': 'Role ID is required'}), 400
        
        role = Role.query.get_or_404(role_id)
        
        # Check if role already assigned
        existing = UserRole.query.filter_by(
            user_account_id=user_id,
            role_id=role_id,
            facility_id=facility_id
        ).first()
        
        if existing:
            if not existing.is_active:
                existing.is_active = True
                db.session.commit()
                return jsonify({
                    'success': True,
                    'message': 'Role reactivated successfully'
                }), 200
            return jsonify({'error': 'Role already assigned'}), 400
        
        # Assign role
        user_role = UserRole(
            user_account_id=user_id,
            role_id=role_id,
            facility_id=facility_id,
            is_active=True
        )
        db.session.add(user_role)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Role assigned successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@user_bp.route('/users/<int:user_id>/roles/<int:role_id>', methods=['DELETE'])
@token_required
@role_required(['admin', 'System Administrator'])
def remove_role(user_id, role_id):
    """Remove role from user"""
    try:
        user_role = UserRole.query.filter_by(
            user_account_id=user_id,
            role_id=role_id
        ).first_or_404()
        
        user_role.is_active = False
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Role removed successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

