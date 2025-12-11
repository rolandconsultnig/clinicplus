"""
Authentication Routes
Basic auth routes (JWT routes are in auth_jwt.py)
"""

from flask import Blueprint, jsonify, request
from src.auth.jwt_manager import token_required
from src.models.auth import UserAccount, Role, UserRole
from src.models.user import db

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/auth', methods=['GET'])
@token_required
def auth_info():
    """Get current authenticated user information"""
    try:
        user = request.current_user
        
        # Get user roles
        user_roles = UserRole.query.filter_by(user_account_id=user.id, is_active=True).all()
        roles = []
        for ur in user_roles:
            role = Role.query.get(ur.role_id)
            if role:
                roles.append({
                    'role_name': role.role_name,
                    'role_description': role.role_description,
                    'facility_id': ur.facility_id
                })
        
        return jsonify({
            'success': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'user_type': user.user_type,
                'is_active': user.is_active,
                'is_verified': user.is_verified,
                'roles': roles
            },
            'auth_endpoints': {
                'login': '/api/auth/jwt/login',
                'logout': '/api/auth/jwt/logout',
                'refresh': '/api/auth/jwt/refresh',
                'verify': '/api/auth/jwt/verify'
            }
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Use /api/auth/jwt/login for JWT authentication'
        }), 401

