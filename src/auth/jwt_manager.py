"""
JWT Authentication Manager for Clinic+
Handles token generation, validation, and user authentication
"""

import jwt
import os
from functools import wraps
from flask import request, jsonify, current_app
from werkzeug.security import check_password_hash
from src.models.user import db
from src.models.auth import UserAccount, UserRole, Role, PatientOTP
from src.models.provider import Provider
from src.services.device_fingerprinting import device_fingerprint_service
from datetime import datetime, timedelta

class JWTManager:
    """Manages JWT token operations for authentication"""
    
    @staticmethod
    def generate_token(user_account, facility_id=None):
        """Generate JWT token for authenticated user"""
        try:
            # Get user roles for the specific facility or all roles
            if facility_id:
                user_roles = db.session.query(UserRole).filter(
                    UserRole.user_account_id == user_account.id,
                    UserRole.facility_id == facility_id,
                    UserRole.is_active == True
                ).all()
            else:
                user_roles = db.session.query(UserRole).filter(
                    UserRole.user_account_id == user_account.id,
                    UserRole.is_active == True
                ).all()
            
            # Build roles list
            roles = []
            for user_role in user_roles:
                role_permissions = []
                if hasattr(user_role.role, 'permissions'):
                    for rp in user_role.role.permissions:
                        if hasattr(rp, 'permission'):
                            role_permissions.append(rp.permission.permission_name)
                
                roles.append({
                    'role_name': user_role.role.role_name,
                    'facility_id': user_role.facility_id,
                    'permissions': role_permissions
                })
            
            # Generate device fingerprint for zero-trust
            device_fingerprint = None
            try:
                from flask import request as flask_request
                device_fingerprint = device_fingerprint_service.generate_device_fingerprint(
                    dict(flask_request.headers) if flask_request else {},
                    flask_request.remote_addr if flask_request else '0.0.0.0',
                    flask_request.headers.get('User-Agent', '') if flask_request else ''
                )
                # Register device as trusted
                device_fingerprint_service.register_trusted_device(
                    user_account.id,
                    device_fingerprint,
                    f"{user_account.username}'s Device"
                )
            except Exception as e:
                # Device fingerprinting is optional
                pass
            
            # Create token payload
            payload = {
                'user_id': user_account.id,
                'username': user_account.username,
                'user_type': user_account.user_type,
                'facility_id': facility_id,
                'roles': roles,
                'device_fingerprint': device_fingerprint,
                'exp': datetime.utcnow() + timedelta(hours=24),
                'iat': datetime.utcnow(),
                'iss': 'clinicplus'
            }
            
            # Generate token - get SECRET_KEY from app config or environment
            try:
                secret_key = current_app.config.get('SECRET_KEY')
            except RuntimeError:
                # If no app context, try to get from environment
                secret_key = os.environ.get('SECRET_KEY', 'medical_app_secret_key_change_in_production')
            
            if not secret_key:
                raise ValueError('SECRET_KEY not configured')
            
            token = jwt.encode(
                payload,
                secret_key,
                algorithm='HS256'
            )
            
            # Get facility information if facility_id is provided
            facility_info = None
            if facility_id:
                from src.models.provider import Facility
                facility = Facility.query.get(facility_id)
                if facility:
                    facility_info = {
                        'id': facility.id,
                        'facility_id': facility.facility_id,
                        'facility_name': facility.facility_name,
                        'facility_type': facility.facility_type
                    }
            
            return {
                'success': True,
                'token': token,
                'expires_in': 86400,  # 24 hours in seconds
                'user': {
                    'id': user_account.id,
                    'username': user_account.username,
                    'user_type': user_account.user_type,
                    'roles': roles,
                    'facility_id': facility_id,
                    'facility': facility_info
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
            # Get SECRET_KEY from app config or environment
            try:
                secret_key = current_app.config.get('SECRET_KEY')
            except RuntimeError:
                # If no app context, try to get from environment
                secret_key = os.environ.get('SECRET_KEY', 'medical_app_secret_key_change_in_production')
            
            if not secret_key:
                raise ValueError('SECRET_KEY not configured')
            
            payload = jwt.decode(
                token,
                secret_key,
                algorithms=['HS256'],
                issuer='clinicplus'
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
            if not user_account.check_password(password):
                # Increment failed login attempts
                user_account.failed_login_attempts += 1
                
                # Lock account after 5 failed attempts
                if user_account.failed_login_attempts >= 5:
                    user_account.account_locked_until = datetime.utcnow() + timedelta(minutes=30)
                
                db.session.commit()
                return {'success': False, 'error': 'Invalid credentials'}
            
            # Check if account is locked
            if (user_account.account_locked_until and 
                user_account.account_locked_until > datetime.utcnow()):
                return {
                    'success': False, 
                    'error': 'Account is locked. Please try again later.'
                }
            
            # Reset failed login attempts on successful login
            user_account.failed_login_attempts = 0
            user_account.last_login = datetime.utcnow()
            user_account.account_locked_until = None
            db.session.commit()

            # Resolve facility for JWT (receptionist routes need non-null facility_id)
            resolved_facility_id = facility_id
            if not resolved_facility_id and getattr(user_account, 'facility_id', None):
                resolved_facility_id = user_account.facility_id
            if not resolved_facility_id:
                first_role = (
                    db.session.query(UserRole)
                    .filter(
                        UserRole.user_account_id == user_account.id,
                        UserRole.is_active == True,
                        UserRole.facility_id.isnot(None),
                    )
                    .first()
                )
                if first_role:
                    resolved_facility_id = first_role.facility_id

            # Generate token
            token_result = JWTManager.generate_token(user_account, resolved_facility_id)
            if not token_result.get('success'):
                print(f"[AUTH ERROR] Token generation failed: {token_result.get('error')}")
            return token_result
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"[AUTH ERROR] Authentication exception: {str(e)}")
            print(f"[AUTH ERROR TRACEBACK]\n{error_trace}")
            return {'success': False, 'error': f'Authentication failed: {str(e)}'}

def token_required(f):
    """Decorator to require valid JWT token for API endpoints"""
    @wraps(f)
    def decorated(*args, **kwargs):
        # Allow OPTIONS requests for CORS preflight
        if request.method == 'OPTIONS':
            return jsonify({}), 200
        
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
        
        # Zero-trust: Verify device fingerprint
        try:
            device_fingerprint = device_fingerprint_service.generate_device_fingerprint(
                request.headers,
                request.remote_addr,
                request.headers.get('User-Agent', '')
            )
            device_verification = device_fingerprint_service.verify_device(
                result['user_account'].id,
                device_fingerprint
            )
            
            # Store device info in request context
            request.device_fingerprint = device_fingerprint
            request.device_trusted = device_verification.get('trusted', False)
        except Exception as e:
            # Don't fail if device fingerprinting fails
            request.device_fingerprint = None
            request.device_trusted = False
        
        # Add user info to request context
        request.current_user = result['user_account']
        request.token_payload = result['payload']
        
        return f(*args, **kwargs)
    
    return decorated


def _normalize_role_token(value):
    """Lowercase role / user_type token with spaces and hyphens collapsed for comparison."""
    return str(value or '').strip().lower().replace(' ', '_').replace('-', '_')


def _collect_effective_role_tokens(payload):
    """
    Tokens granted by JWT role rows plus user_type.
    Many Clinic+ logins only set user_type on UserAccount while roles[] is empty — without this,
    @role_required would always return 403 for those users.
    """
    tokens = set()
    for role in payload.get('roles') or []:
        name = role.get('role_name')
        if name:
            tokens.add(_normalize_role_token(name))
    ut = _normalize_role_token(payload.get('user_type'))
    if ut:
        tokens.add(ut)
        if ut in ('admin', 'root_admin'):
            tokens.update(('system_administrator', 'administrator', 'admin'))
        if ut in ('doctor', 'provider'):
            tokens.add('physician')
        if ut == 'system_administrator':
            tokens.add('system_administrator')
        if ut == 'facility_administrator':
            tokens.add('facility_administrator')
    return tokens


def role_required(required_roles):
    """Decorator to require specific roles for API endpoints"""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not hasattr(request, 'token_payload'):
                return jsonify({'error': 'Authentication required'}), 401

            payload = request.token_payload
            user_roles = [role['role_name'] for role in payload.get('roles', [])]

            effective_tokens = _collect_effective_role_tokens(payload)
            required_tokens = {_normalize_role_token(r) for r in required_roles}

            has_role = not required_tokens.isdisjoint(effective_tokens)

            # Exact display-name matches (legacy tokens that do not normalize the same way)
            has_exact_match = any(role in user_roles for role in required_roles)

            requires_admin = bool(
                required_tokens
                & {'system_administrator', 'administrator', 'facility_administrator'}
            )

            is_admin_user = bool(
                effective_tokens
                & {'admin', 'root_admin', 'system_administrator', 'administrator', 'facility_administrator'}
            )

            if not (has_role or has_exact_match or (is_admin_user and requires_admin)):
                return jsonify({'error': 'Insufficient permissions', 'message': 'You do not have permission to access this resource'}), 403

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

def otp_verification_required(f):
    """Decorator to require OTP verification for accessing patient data"""
    @wraps(f)
    def decorated(*args, **kwargs):
        # Skip OTP check for System Administrators
        if hasattr(request, 'token_payload'):
            user_roles = [role['role_name'] for role in request.token_payload.get('roles', [])]
            if 'System Administrator' in user_roles:
                return f(*args, **kwargs)
        
        # Get patient_id from kwargs or request
        patient_id = kwargs.get('patient_id')
        if not patient_id and request.is_json:
            patient_id = request.json.get('patient_id')
        if not patient_id:
            patient_id = request.args.get('patient_id')
        
        if not patient_id:
            return jsonify({
                'error': 'Patient ID is required',
                'otp_required': True
            }), 400
        
        try:
            patient_id = int(patient_id)
        except (ValueError, TypeError):
            return jsonify({
                'error': 'Invalid patient ID',
                'otp_required': True
            }), 400
        
        # Get provider info
        provider = None
        if hasattr(request, 'current_user'):
            provider = Provider.query.filter_by(user_account_id=request.current_user.id).first()
        
        facility_id = request.token_payload.get('facility_id') if hasattr(request, 'token_payload') else None
        
        # Check for valid verified OTP
        verified_otp = PatientOTP.query.filter(
            PatientOTP.patient_id == patient_id,
            PatientOTP.is_used == True,
            PatientOTP.is_active == True,
            PatientOTP.verified_at.isnot(None)
        ).filter(
            (PatientOTP.provider_id == provider.id if provider else False) |
            (PatientOTP.facility_id == facility_id if facility_id else False) |
            (PatientOTP.provider_id.is_(None))  # General OTPs
        ).order_by(PatientOTP.verified_at.desc()).first()
        
        if verified_otp:
            # Check if verification is still valid (within session window - 1 hour)
            verification_valid_duration = timedelta(hours=1)
            if verified_otp.verified_at and (datetime.utcnow() - verified_otp.verified_at) < verification_valid_duration:
                # OTP verified, allow access
                request.otp_verified = True
                request.otp_access_scope = verified_otp.access_scope
                return f(*args, **kwargs)
        
        # OTP verification required
        return jsonify({
            'error': 'OTP verification required to access patient data',
            'otp_required': True,
            'patient_id': patient_id,
            'message': 'Please verify OTP code to access this patient\'s data'
        }), 403
    
    return decorated

