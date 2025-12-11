"""
JWT Authentication Manager for MedConnect
Handles token generation, validation, and user authentication
"""

import jwt
import datetime
from functools import wraps
from flask import request, jsonify, current_app
from werkzeug.security import check_password_hash
from models.user import User
from models.auth import UserAccount, UserRole, Role
from database import db

class JWTManager:
    """Manages JWT token operations for authentication"""
    
    @staticmethod
    def generate_token(user_account, facility_id=None):
        """Generate JWT token for authenticated user"""
        try:
            # Get user roles for the specific facility or all roles
            if facility_id:
                user_roles = db.session.query(UserRole).join(Role).filter(
                    UserRole.user_account_id == user_account.id,
                    UserRole.facility_id == facility_id
                ).all()
            else:
                user_roles = db.session.query(UserRole).join(Role).filter(
                    UserRole.user_account_id == user_account.id
                ).all()
            
            # Build roles list
            roles = []
            for user_role in user_roles:
                roles.append({
                    'role_name': user_role.role.role_name,
                    'facility_id': user_role.facility_id,
                    'permissions': user_role.role.permissions or []
                })
            
            # Create token payload
            payload = {
                'user_id': user_account.id,
                'username': user_account.username,
                'user_type': user_account.user_type,
                'facility_id': facility_id,
                'roles': roles,
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24),
                'iat': datetime.datetime.utcnow(),
                'iss': 'medconnect'
            }
            
            # Generate token
            token = jwt.encode(
                payload,
                current_app.config['SECRET_KEY'],
                algorithm='HS256'
            )
            
            return {
                'success': True,
                'token': token,
                'expires_in': 86400,  # 24 hours in seconds
                'user': {
                    'id': user_account.id,
                    'username': user_account.username,
                    'user_type': user_account.user_type,
                    'roles': roles
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Token generation failed: {str(e)}'
            }
    
    @staticmethod
    def verify_token(token):
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(
                token,
                current_app.config['SECRET_KEY'],
                algorithms=['HS256'],
                issuer='medconnect'
            )
            
            # Check if user still exists and is active
            user_account = UserAccount.query.get(payload['user_id'])
            if not user_account or not user_account.is_active:
                return {'success': False, 'error': 'User account not found or inactive'}
            
            return {
                'success': True,
                'payload': payload,
                'user_account': user_account
            }
            
        except jwt.ExpiredSignatureError:
            return {'success': False, 'error': 'Token has expired'}
        except jwt.InvalidTokenError:
            return {'success': False, 'error': 'Invalid token'}
        except Exception as e:
            return {'success': False, 'error': f'Token verification failed: {str(e)}'}
    
    @staticmethod
    def authenticate_user(username, password, facility_id=None):
        """Authenticate user credentials and generate token"""
        try:
            # Find user account
            user_account = UserAccount.query.filter_by(
                username=username,
                is_active=True
            ).first()
            
            if not user_account:
                return {'success': False, 'error': 'Invalid credentials'}
            
            # Check password
            if not check_password_hash(user_account.password_hash, password):
                # Increment failed login attempts
                user_account.failed_login_attempts += 1
                user_account.last_failed_login = datetime.datetime.utcnow()
                
                # Lock account after 5 failed attempts
                if user_account.failed_login_attempts >= 5:
                    user_account.account_locked_until = datetime.datetime.utcnow() + datetime.timedelta(minutes=30)
                
                db.session.commit()
                return {'success': False, 'error': 'Invalid credentials'}
            
            # Check if account is locked
            if (user_account.account_locked_until and 
                user_account.account_locked_until > datetime.datetime.utcnow()):
                return {
                    'success': False, 
                    'error': 'Account is locked. Please try again later.'
                }
            
            # Reset failed login attempts on successful login
            user_account.failed_login_attempts = 0
            user_account.last_login = datetime.datetime.utcnow()
            user_account.account_locked_until = None
            db.session.commit()
            
            # Generate token
            return JWTManager.generate_token(user_account, facility_id)
            
        except Exception as e:
            return {'success': False, 'error': f'Authentication failed: {str(e)}'}

def token_required(f):
    """Decorator to require valid JWT token for API endpoints"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]  # Bearer <token>
            except IndexError:
                return jsonify({'error': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        # Verify token
        result = JWTManager.verify_token(token)
        if not result['success']:
            return jsonify({'error': result['error']}), 401
        
        # Add user info to request context
        request.current_user = result['user_account']
        request.token_payload = result['payload']
        
        return f(*args, **kwargs)
    
    return decorated

def role_required(required_roles):
    """Decorator to require specific roles for API endpoints"""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not hasattr(request, 'token_payload'):
                return jsonify({'error': 'Authentication required'}), 401
            
            user_roles = [role['role_name'] for role in request.token_payload.get('roles', [])]
            
            # Check if user has any of the required roles
            if not any(role in user_roles for role in required_roles):
                return jsonify({'error': 'Insufficient permissions'}), 403
            
            return f(*args, **kwargs)
        
        return decorated
    return decorator

def facility_access_required(f):
    """Decorator to ensure user has access to the requested facility"""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not hasattr(request, 'token_payload'):
            return jsonify({'error': 'Authentication required'}), 401
        
        # Get facility_id from request (URL parameter, JSON body, or query parameter)
        facility_id = None
        if 'facility_id' in kwargs:
            facility_id = kwargs['facility_id']
        elif request.is_json and 'facility_id' in request.json:
            facility_id = request.json['facility_id']
        elif 'facility_id' in request.args:
            facility_id = request.args.get('facility_id')
        
        if facility_id:
            # Check if user has access to this facility
            user_facilities = [role.get('facility_id') for role in request.token_payload.get('roles', [])]
            if facility_id not in user_facilities and None not in user_facilities:
                return jsonify({'error': 'Access denied to this facility'}), 403
        
        return f(*args, **kwargs)
    
    return decorated

