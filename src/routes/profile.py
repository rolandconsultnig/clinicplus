"""
Profile Management Routes
Handles user profile operations including role-based profile data
"""

from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.auth import UserAccount, Role, UserRole
from src.models.patient import Patient
from src.models.provider import Provider
from datetime import datetime

profile_bp = Blueprint('profile', __name__)

@profile_bp.route('/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    """Get current user's profile with role-based data"""
    try:
        user = UserAccount.query.get(current_user['user_id'])
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        profile_data = user.to_dict()
        
        # Add role information
        user_roles = UserRole.query.filter_by(
            user_account_id=user.id,
            is_active=True
        ).all()
        
        roles_data = []
        for user_role in user_roles:
            role = Role.query.get(user_role.role_id)
            if role and role.is_active:
                roles_data.append({
                    'id': role.id,
                    'name': role.role_name,
                    'description': role.role_description,
                    'category': role.role_category,
                    'facility_id': user_role.facility_id,
                    'assigned_at': user_role.assigned_at.isoformat() if user_role.assigned_at else None
                })
        
        profile_data['roles'] = roles_data
        
        # Add role-specific data based on user type
        if user.user_type == 'patient' and user.patient_id:
            patient = Patient.query.get(user.patient_id)
            if patient:
                profile_data['patient_data'] = {
                    'id': patient.id,
                    'first_name': patient.first_name,
                    'last_name': patient.last_name,
                    'date_of_birth': patient.date_of_birth.isoformat() if patient.date_of_birth else None,
                    'gender': patient.gender,
                    'phone': patient.phone,
                    'address': patient.address
                }
        
        if user.user_type == 'provider' and user.provider_id:
            provider = Provider.query.get(user.provider_id)
            if provider:
                profile_data['provider_data'] = {
                    'id': provider.id,
                    'first_name': provider.first_name,
                    'last_name': provider.last_name,
                    'specialty': provider.specialty,
                    'license_number': provider.license_number,
                    'phone': provider.phone,
                    'email': provider.email
                }
        
        return jsonify({
            'success': True,
            'profile': profile_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@profile_bp.route('/profile', methods=['PUT'])
@token_required
def update_profile(current_user):
    """Update user profile"""
    try:
        user = UserAccount.query.get(current_user['user_id'])
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        # Update basic fields
        if 'email' in data:
            # Check if email is already taken by another user
            existing = UserAccount.query.filter_by(email=data['email']).first()
            if existing and existing.id != user.id:
                return jsonify({'error': 'Email already in use'}), 400
            user.email = data['email']
        
        if 'username' in data:
            # Check if username is already taken
            existing = UserAccount.query.filter_by(username=data['username']).first()
            if existing and existing.id != user.id:
                return jsonify({'error': 'Username already in use'}), 400
            user.username = data['username']
        
        # Update role-specific data
        if user.user_type == 'patient' and user.patient_id and 'patient_data' in data:
            patient = Patient.query.get(user.patient_id)
            if patient:
                patient_data = data['patient_data']
                if 'first_name' in patient_data:
                    patient.first_name = patient_data['first_name']
                if 'last_name' in patient_data:
                    patient.last_name = patient_data['last_name']
                if 'phone' in patient_data:
                    patient.phone = patient_data['phone']
                if 'address' in patient_data:
                    patient.address = patient_data['address']
                patient.updated_at = datetime.utcnow()
        
        if user.user_type == 'provider' and user.provider_id and 'provider_data' in data:
            provider = Provider.query.get(user.provider_id)
            if provider:
                provider_data = data['provider_data']
                if 'first_name' in provider_data:
                    provider.first_name = provider_data['first_name']
                if 'last_name' in provider_data:
                    provider.last_name = provider_data['last_name']
                if 'phone' in provider_data:
                    provider.phone = provider_data['phone']
                if 'email' in provider_data:
                    provider.email = provider_data['email']
                provider.updated_at = datetime.utcnow()
        
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Profile updated successfully',
            'profile': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@profile_bp.route('/profile/password', methods=['PUT'])
@token_required
def change_password(current_user):
    """Change user password"""
    try:
        user = UserAccount.query.get(current_user['user_id'])
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        if 'current_password' not in data or 'new_password' not in data:
            return jsonify({'error': 'Current password and new password required'}), 400
        
        # Verify current password
        if not user.check_password(data['current_password']):
            return jsonify({'error': 'Current password is incorrect'}), 400
        
        # Set new password
        user.set_password(data['new_password'])
        user.must_change_password = False
        user.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Password changed successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@profile_bp.route('/profile/mfa', methods=['PUT'])
@token_required
def toggle_mfa(current_user):
    """Enable or disable MFA"""
    try:
        user = UserAccount.query.get(current_user['user_id'])
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        if 'enabled' not in data:
            return jsonify({'error': 'enabled field required'}), 400
        
        user.mfa_enabled = data['enabled']
        if not data['enabled']:
            user.mfa_secret = None
        
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'MFA {"enabled" if data["enabled"] else "disabled"} successfully',
            'mfa_enabled': user.mfa_enabled
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@profile_bp.route('/profile/roles', methods=['GET'])
@token_required
def get_user_roles(current_user):
    """Get all roles assigned to current user"""
    try:
        user = UserAccount.query.get(current_user['user_id'])
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user_roles = UserRole.query.filter_by(
            user_account_id=user.id,
            is_active=True
        ).all()
        
        roles_data = []
        for user_role in user_roles:
            role = Role.query.get(user_role.role_id)
            if role and role.is_active:
                roles_data.append({
                    'id': role.id,
                    'name': role.role_name,
                    'description': role.role_description,
                    'category': role.role_category,
                    'facility_id': user_role.facility_id,
                    'assigned_at': user_role.assigned_at.isoformat() if user_role.assigned_at else None,
                    'expires_at': user_role.expires_at.isoformat() if user_role.expires_at else None
                })
        
        return jsonify({
            'success': True,
            'roles': roles_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

