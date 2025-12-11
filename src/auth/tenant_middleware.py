"""
Tenant Isolation Middleware for Clinic+
Ensures proper data separation between healthcare facilities
"""

from functools import wraps
from flask import request, jsonify
from src.models.user import db
from src.models.auth import UserRole, Role
from src.models.provider import Facility

class TenantManager:
    """Manages tenant isolation and data access control"""
    
    @staticmethod
    def get_user_facilities(user_account_id):
        """Get all facilities a user has access to"""
        try:
            user_roles = db.session.query(UserRole).filter_by(
                user_account_id=user_account_id
            ).all()
            
            facilities = []
            for user_role in user_roles:
                if user_role.facility_id:
                    facility = Facility.query.get(user_role.facility_id)
                    if facility:
                        facilities.append({
                            'id': facility.id,
                            'facility_id': facility.facility_id,
                            'facility_name': facility.facility_name,
                            'facility_type': facility.facility_type,
                            'role': user_role.role.role_name
                        })
                else:
                    # System-wide role (like System Administrator)
                    facilities.append({
                        'id': None,
                        'facility_id': 'SYSTEM',
                        'facility_name': 'System Wide',
                        'facility_type': 'system',
                        'role': user_role.role.role_name
                    })
            
            return {'success': True, 'facilities': facilities}
            
        except Exception as e:
            return {'success': False, 'error': f'Failed to get user facilities: {str(e)}'}
    
    @staticmethod
    def check_facility_access(user_account_id, facility_id):
        """Check if user has access to a specific facility"""
        try:
            # System administrators have access to all facilities
            system_admin_role = db.session.query(UserRole).join(Role).filter(
                UserRole.user_account_id == user_account_id,
                Role.role_name == 'System Administrator'
            ).first()
            
            if system_admin_role:
                return {'success': True, 'access_level': 'system_admin'}
            
            # Check specific facility access
            facility_access = db.session.query(UserRole).filter_by(
                user_account_id=user_account_id,
                facility_id=facility_id
            ).first()
            
            if facility_access:
                return {'success': True, 'access_level': 'facility_user'}
            
            return {'success': False, 'error': 'No access to this facility'}
            
        except Exception as e:
            return {'success': False, 'error': f'Access check failed: {str(e)}'}
    
    @staticmethod
    def get_accessible_data_filter(user_account_id, model_class):
        """Get SQLAlchemy filter for data accessible to user"""
        try:
            # Get user's accessible facilities
            result = TenantManager.get_user_facilities(user_account_id)
            if not result['success']:
                return None
            
            facility_ids = [f['id'] for f in result['facilities'] if f['id'] is not None]
            
            # Check if user is system admin
            has_system_access = any(f['facility_id'] == 'SYSTEM' for f in result['facilities'])
            
            if has_system_access:
                # System admin can access all data
                return None
            
            # Filter by accessible facilities
            if hasattr(model_class, 'facility_id'):
                return model_class.facility_id.in_(facility_ids)
            
            return None
            
        except Exception as e:
            return None

def tenant_isolation_required(f):
    """Decorator to enforce tenant isolation on API endpoints"""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not hasattr(request, 'current_user'):
            return jsonify({'error': 'Authentication required'}), 401
        
        # Store user's accessible facilities in request context
        result = TenantManager.get_user_facilities(request.current_user.id)
        if not result['success']:
            return jsonify({'error': 'Failed to determine facility access'}), 500
        
        request.user_facilities = result['facilities']
        
        return f(*args, **kwargs)
    
    return decorated

def facility_data_filter(model_class):
    """Decorator to automatically filter data by user's accessible facilities"""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not hasattr(request, 'current_user'):
                return jsonify({'error': 'Authentication required'}), 401
            
            # Get data filter for user
            data_filter = TenantManager.get_accessible_data_filter(
                request.current_user.id, 
                model_class
            )
            
            # Store filter in request context for use in the endpoint
            request.data_filter = data_filter
            
            return f(*args, **kwargs)
        
        return decorated
    return decorator

class CrossFacilityAccess:
    """Manages cross-facility data sharing with patient consent"""
    
    @staticmethod
    def create_access_token(patient_id, source_facility_id, target_facility_id, 
                          requested_by_user_id, access_duration_hours=24):
        """Create a cross-facility access token"""
        try:
            from src.models.clinical import CrossFacilityAccess as CFAModel
            from datetime import datetime, timedelta
            
            # Check if patient allows cross-facility sharing
            from src.models.patient import Patient
            patient = Patient.query.get(patient_id)
            if not patient or not patient.allow_cross_facility_sharing:
                return {
                    'success': False, 
                    'error': 'Patient does not allow cross-facility data sharing'
                }
            
            # Create access token
            access_token = CFAModel(
                patient_id=patient_id,
                source_facility_id=source_facility_id,
                target_facility_id=target_facility_id,
                requested_by_user_id=requested_by_user_id,
                expires_at=datetime.utcnow() + timedelta(hours=access_duration_hours),
                is_active=True
            )
            
            db.session.add(access_token)
            db.session.commit()
            
            return {
                'success': True,
                'access_token_id': access_token.id,
                'expires_at': access_token.expires_at.isoformat()
            }
            
        except Exception as e:
            db.session.rollback()
            return {'success': False, 'error': f'Failed to create access token: {str(e)}'}
    
    @staticmethod
    def verify_cross_facility_access(patient_id, source_facility_id, target_facility_id):
        """Verify if cross-facility access is allowed"""
        try:
            from src.models.clinical import CrossFacilityAccess as CFAModel
            from datetime import datetime
            
            # Check for valid access token
            access_token = CFAModel.query.filter_by(
                patient_id=patient_id,
                source_facility_id=source_facility_id,
                target_facility_id=target_facility_id,
                is_active=True
            ).filter(
                CFAModel.expires_at > datetime.utcnow()
            ).first()
            
            if access_token:
                return {'success': True, 'access_token_id': access_token.id}
            
            return {'success': False, 'error': 'No valid cross-facility access token'}
            
        except Exception as e:
            return {'success': False, 'error': f'Access verification failed: {str(e)}'}

def cross_facility_access_required(f):
    """Decorator to check cross-facility access permissions"""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not hasattr(request, 'current_user'):
            return jsonify({'error': 'Authentication required'}), 401
        
        # Get patient_id and facility information from request
        patient_id = request.json.get('patient_id') if request.is_json else request.args.get('patient_id')
        target_facility_id = request.json.get('facility_id') if request.is_json else request.args.get('facility_id')
        
        if patient_id and target_facility_id:
            # Get user's current facility
            user_facility_id = request.token_payload.get('facility_id')
            
            if user_facility_id != target_facility_id:
                # Cross-facility access required
                result = CrossFacilityAccess.verify_cross_facility_access(
                    patient_id, user_facility_id, target_facility_id
                )
                
                if not result['success']:
                    return jsonify({'error': 'Cross-facility access denied'}), 403
        
        return f(*args, **kwargs)
    
    return decorated

