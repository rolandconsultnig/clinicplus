"""
HIPAA-Compliant Audit Trail Middleware
Automatically logs all PHI access and system activities for HIPAA compliance
"""
from functools import wraps
from flask import request, g
from src.models.user import db
from src.models.auth import AuditLog
from datetime import datetime
import uuid
import json
import time

def sanitize_phi(data):
    """Sanitize PHI from request data for logging"""
    if not data:
        return None
    
    if isinstance(data, dict):
        sanitized = {}
        phi_fields = ['ssn', 'social_security', 'nin', 'date_of_birth', 'dob', 
                     'phone', 'email', 'address', 'insurance_id', 'policy_number',
                     'credit_card', 'card_number', 'cvv', 'password', 'pin']
        
        for key, value in data.items():
            key_lower = key.lower()
            if any(phi in key_lower for phi in phi_fields):
                sanitized[key] = '[REDACTED]'
            elif isinstance(value, (dict, list)):
                sanitized[key] = sanitize_phi(value)
            else:
                sanitized[key] = value
        return sanitized
    elif isinstance(data, list):
        return [sanitize_phi(item) for item in data]
    else:
        return data

def create_audit_log(action_type, resource_type=None, resource_id=None, 
                    patient_id=None, data_accessed=None, success=True, 
                    error_message=None, duration_ms=None):
    """Create comprehensive HIPAA audit log entry"""
    try:
        user = getattr(request, 'current_user', None)
        token_payload = getattr(request, 'token_payload', {})
        
        # Get request details
        endpoint = request.endpoint or request.path
        http_method = request.method
        ip_address = request.remote_addr or request.environ.get('HTTP_X_FORWARDED_FOR', '').split(',')[0]
        user_agent = request.headers.get('User-Agent', '')
        session_id = token_payload.get('session_id') or request.headers.get('X-Session-ID', '')
        
        # Sanitize request data
        request_data = None
        if request.is_json:
            request_data = sanitize_phi(request.get_json())
        elif request.form:
            request_data = sanitize_phi(dict(request.form))
        elif request.args:
            request_data = sanitize_phi(dict(request.args))
        
        # Determine data accessed
        if not data_accessed and patient_id:
            data_accessed = {
                'patient_id': patient_id,
                'resource_type': resource_type,
                'resource_id': resource_id,
                'endpoint': endpoint
            }
        
        # Create audit log
        audit_log = AuditLog(
            log_id=f"AUDIT-{uuid.uuid4().hex[:12].upper()}",
            user_id=user.id if user else None,
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent,
            action_type=action_type,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            patient_id=patient_id,
            data_accessed=json.dumps(data_accessed) if data_accessed else None,
            endpoint=endpoint,
            http_method=http_method,
            request_data=json.dumps(request_data) if request_data else None,
            response_status=200 if success else 500,
            timestamp=datetime.utcnow(),
            duration_ms=duration_ms,
            success=success,
            error_message=error_message,
            facility_id=getattr(request, 'facility_id', None)
        )
        
        db.session.add(audit_log)
        db.session.commit()
        return audit_log
        
    except Exception as e:
        # Don't fail the request if audit logging fails
        print(f"Error creating audit log: {e}")
        try:
            db.session.rollback()
        except:
            pass
        return None

def hipaa_audit_required(action_type=None, resource_type=None):
    """
    Decorator to automatically log PHI access for HIPAA compliance
    Usage:
        @hipaa_audit_required(action_type='view', resource_type='patient')
        def get_patient(patient_id):
            ...
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            start_time = time.time()
            success = True
            error_message = None
            patient_id = kwargs.get('patient_id') or request.args.get('patient_id') or (request.json.get('patient_id') if request.is_json else None)
            
            try:
                # Execute the function
                result = f(*args, **kwargs)
                
                # Determine action type
                actual_action_type = action_type
                if not actual_action_type:
                    if request.method == 'GET':
                        actual_action_type = 'view'
                    elif request.method == 'POST':
                        actual_action_type = 'create'
                    elif request.method == 'PUT' or request.method == 'PATCH':
                        actual_action_type = 'update'
                    elif request.method == 'DELETE':
                        actual_action_type = 'delete'
                    else:
                        actual_action_type = 'access'
                
                # Determine resource type
                actual_resource_type = resource_type or request.endpoint or 'unknown'
                
                # Get resource ID from response if available
                resource_id = None
                if isinstance(result, tuple) and len(result) > 0:
                    response_data = result[0]
                    if hasattr(response_data, 'get_json'):
                        json_data = response_data.get_json()
                        if isinstance(json_data, dict):
                            resource_id = json_data.get('id') or json_data.get('patient_id') or json_data.get('encounter_id')
                
                # Calculate duration
                duration_ms = int((time.time() - start_time) * 1000)
                
                # Create audit log
                create_audit_log(
                    action_type=actual_action_type,
                    resource_type=actual_resource_type,
                    resource_id=resource_id or kwargs.get('patient_id') or kwargs.get('encounter_id'),
                    patient_id=patient_id,
                    success=True,
                    duration_ms=duration_ms
                )
                
                return result
                
            except Exception as e:
                success = False
                error_message = str(e)
                duration_ms = int((time.time() - start_time) * 1000)
                
                # Log the error
                create_audit_log(
                    action_type=action_type or 'error',
                    resource_type=resource_type,
                    patient_id=patient_id,
                    success=False,
                    error_message=error_message,
                    duration_ms=duration_ms
                )
                
                raise
                
        return decorated_function
    return decorator

def log_phi_access(patient_id, resource_type, resource_id=None, action='view', details=None):
    """Explicitly log PHI access"""
    return create_audit_log(
        action_type=action,
        resource_type=resource_type,
        resource_id=resource_id,
        patient_id=patient_id,
        data_accessed=details
    )

def log_user_action(action_type, resource_type=None, resource_id=None, details=None):
    """Log user action (non-PHI)"""
    return create_audit_log(
        action_type=action_type,
        resource_type=resource_type,
        resource_id=resource_id,
        data_accessed=details
    )

