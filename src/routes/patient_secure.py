"""
Secure Patient Data Management API Routes for Clinic+
Implements patient-centered data access with JWT authentication and tenant isolation
"""

from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required, otp_verification_required
from src.auth.tenant_middleware import (
    tenant_isolation_required, 
    facility_data_filter, 
    cross_facility_access_required,
    TenantManager,
    CrossFacilityAccess
)
from src.models.user import db
from src.models.patient import Patient, MedicalHistory, Allergy, Medication
from src.models.clinical import ClinicalEncounter, VitalSigns, ClinicalNote, LabResult
from src.models.auth import UserAccount, AuditLog
import datetime
import uuid
import json

patient_secure_bp = Blueprint('patient_secure', __name__)

# Patient CRUD Operations

@patient_secure_bp.route('/', methods=['GET'])
@token_required
@tenant_isolation_required
@facility_data_filter(Patient)
def get_patients():
    """Get patients with tenant isolation and access control"""
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        facility_id = request.args.get('facility_id', type=int)
        
        # Build base query with tenant isolation
        query = Patient.query.filter(Patient.is_active == True)
        
        # Apply data filter based on user's facility access
        if request.data_filter is not None:
            query = query.filter(request.data_filter)
        
        # Apply facility filter if specified
        if facility_id:
            query = query.filter(Patient.facility_id == facility_id)
        
        # Apply search filter
        if search:
            query = query.filter(
                db.or_(
                    Patient.first_name.ilike(f'%{search}%'),
                    Patient.last_name.ilike(f'%{search}%'),
                    Patient.universal_patient_id.ilike(f'%{search}%'),
                    Patient.email.ilike(f'%{search}%')
                )
            )
        
        # Check user permissions
        user_roles = [role['role_name'] for role in request.token_payload.get('roles', [])]
        
        # Patients can only see their own data
        if 'Patient' in user_roles and 'System Administrator' not in user_roles:
            # Find patient record for current user
            patient = Patient.query.filter_by(user_account_id=request.current_user.id).first()
            if patient:
                query = query.filter(Patient.id == patient.id)
            else:
                return jsonify({'success': True, 'patients': [], 'total': 0}), 200
        
        # Paginate results
        patients = query.order_by(Patient.last_name, Patient.first_name).paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        # Convert to dict with appropriate data based on user role
        patients_data = []
        for patient in patients.items:
            patient_data = patient.to_dict()
            
            # Add additional data for healthcare providers
            if any(role in user_roles for role in ['Physician', 'Nurse', 'System Administrator']):
                patient_data['medical_summary'] = {
                    'active_medications': len(patient.medications or []),
                    'known_allergies': len(patient.allergies or []),
                    'recent_encounters': ClinicalEncounter.query.filter_by(
                        patient_id=patient.id
                    ).order_by(ClinicalEncounter.encounter_date.desc()).limit(3).count()
                }
            
            patients_data.append(patient_data)
        
        # Log access
        audit_log = AuditLog(
            log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
            user_id=request.current_user.id,
            action_type='patient_list_access',
            resource_type='patient',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            success=True,
            details=json.dumps({'total_records': patients.total, 'search_term': search})
        )
        db.session.add(audit_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'patients': patients_data,
            'total': patients.total,
            'pages': patients.pages,
            'current_page': page,
            'user_facilities': request.user_facilities
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to get patients: {str(e)}'}), 500

@patient_secure_bp.route('/<patient_id>', methods=['GET'])
@token_required
@tenant_isolation_required
@cross_facility_access_required
def get_patient(patient_id):
    """Get detailed patient information with access control"""
    try:
        # Find patient by ID or universal patient ID
        patient = Patient.query.filter(
            db.or_(
                Patient.id == patient_id,
                Patient.universal_patient_id == patient_id
            )
        ).first()
        
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        # Check access permissions
        user_roles = [role['role_name'] for role in request.token_payload.get('roles', [])]
        
        # Patients can only access their own data (no OTP required for own data)
        if 'Patient' in user_roles and 'System Administrator' not in user_roles:
            user_patient = Patient.query.filter_by(user_account_id=request.current_user.id).first()
            if not user_patient or user_patient.id != patient.id:
                return jsonify({'error': 'Access denied'}), 403
        
        # Check facility access for providers - require OTP verification
        elif not any(role in user_roles for role in ['System Administrator']):
            # Check OTP verification for providers accessing patient data
            try:
                from src.models.auth import PatientOTP
                from src.models.provider import Provider
                from datetime import datetime, timedelta
                
                provider = Provider.query.filter_by(user_account_id=request.current_user.id).first()
                facility_id = request.token_payload.get('facility_id')
                
                # Check for valid verified OTP
                verified_otp = PatientOTP.query.filter(
                    PatientOTP.patient_id == patient.id,
                    PatientOTP.is_used == True,
                    PatientOTP.is_active == True,
                    PatientOTP.verified_at.isnot(None)
                ).filter(
                    (PatientOTP.provider_id == provider.id if provider else False) |
                    (PatientOTP.facility_id == facility_id if facility_id else False) |
                    (PatientOTP.provider_id.is_(None))
                ).order_by(PatientOTP.verified_at.desc()).first()
                
                if not verified_otp or not verified_otp.verified_at:
                    return jsonify({
                        'error': 'OTP verification required to access patient data',
                        'otp_required': True,
                        'patient_id': patient.id,
                        'message': 'Please verify OTP code to access this patient\'s data'
                    }), 403
                
                # Check if verification is still valid (within 1 hour)
                verification_valid_duration = timedelta(hours=1)
                if (datetime.utcnow() - verified_otp.verified_at) >= verification_valid_duration:
                    return jsonify({
                        'error': 'OTP verification expired. Please verify OTP again',
                        'otp_required': True,
                        'patient_id': patient.id
                    }), 403
            except Exception as otp_error:
                # If OTP check fails, still allow access but log the error
                pass
            user_facility_ids = [f['id'] for f in request.user_facilities if f['id'] is not None]
            if patient.facility_id not in user_facility_ids:
                # Check cross-facility access
                access_result = CrossFacilityAccess.verify_cross_facility_access(
                    patient.id, 
                    request.token_payload.get('facility_id'),
                    patient.facility_id
                )
                if not access_result['success']:
                    return jsonify({'error': 'Cross-facility access required'}), 403
        
        # Build patient data based on user role and permissions
        patient_data = patient.to_dict()
        
        # Add comprehensive medical data for healthcare providers
        if any(role in user_roles for role in ['Physician', 'Nurse', 'Pharmacist', 'Lab Technician', 'System Administrator']):
            # Medical history
            patient_data['medical_history'] = [
                history.to_dict() for history in patient.medical_history or []
            ]
            
            # Allergies
            patient_data['allergies'] = [
                allergy.to_dict() for allergy in patient.allergies or []
            ]
            
            # Current medications
            patient_data['medications'] = [
                medication.to_dict() for medication in patient.medications or []
            ]
            
            # Recent clinical encounters
            recent_encounters = ClinicalEncounter.query.filter_by(
                patient_id=patient.id
            ).order_by(ClinicalEncounter.encounter_date.desc()).limit(10).all()
            
            patient_data['recent_encounters'] = [
                encounter.to_dict() for encounter in recent_encounters
            ]
            
            # Recent vital signs
            recent_vitals = VitalSigns.query.filter_by(
                patient_id=patient.id
            ).order_by(VitalSigns.recorded_at.desc()).limit(5).all()
            
            patient_data['recent_vitals'] = [
                vitals.to_dict() for vitals in recent_vitals
            ]
            
            # Recent lab results
            recent_labs = LabResult.query.filter_by(
                patient_id=patient.id
            ).order_by(LabResult.result_date.desc()).limit(10).all()
            
            patient_data['recent_lab_results'] = [
                lab.to_dict() for lab in recent_labs
            ]
        
        # Log access
        audit_log = AuditLog(
            log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
            user_id=request.current_user.id,
            action_type='patient_detail_access',
            resource_type='patient',
            resource_id=patient.id,
            patient_id=patient.id,
            facility_id=patient.facility_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            success=True
        )
        db.session.add(audit_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'patient': patient_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to get patient: {str(e)}'}), 500

@patient_secure_bp.route('/', methods=['POST'])
@token_required
@role_required([
    'Physician', 'Nurse', 'Facility Administrator', 'System Administrator',
    'Receptionist', 'Provider', 'Pharmacist', 'Lab Technician', 'Radiographer',
])
@tenant_isolation_required
def create_patient():
    """Create new patient record"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['first_name', 'last_name', 'date_of_birth']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Get user's facility context
        facility_id = request.token_payload.get('facility_id')
        if not facility_id and 'System Administrator' not in [role['role_name'] for role in request.token_payload.get('roles', [])]:
            return jsonify({'error': 'Facility context required'}), 400
        
        # Create patient record
        patient = Patient(
            universal_patient_id=f"PAT-{uuid.uuid4().hex[:8].upper()}",
            first_name=data['first_name'],
            last_name=data['last_name'],
            date_of_birth=datetime.datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date(),
            gender=data.get('gender'),
            phone_primary=data.get('phone_primary'),
            phone_secondary=data.get('phone_secondary'),
            email=data.get('email'),
            address_line1=data.get('address_line1'),
            address_line2=data.get('address_line2'),
            city=data.get('city'),
            state=data.get('state'),
            zip_code=data.get('zip_code'),
            country=data.get('country', 'Nigeria'),
            emergency_contact_name=data.get('emergency_contact_name'),
            emergency_contact_phone=data.get('emergency_contact_phone'),
            emergency_contact_relationship=data.get('emergency_contact_relationship'),
            insurance_provider=data.get('insurance_provider'),
            insurance_policy_number=data.get('insurance_policy_number'),
            insurance_group_number=data.get('insurance_group_number'),
            allow_cross_facility_sharing=data.get('allow_cross_facility_sharing', True),
            facility_id=facility_id,
            created_by=request.current_user.id,
            created_at=datetime.datetime.utcnow()
        )
        
        db.session.add(patient)
        db.session.flush()  # Get the ID
        
        # Add medical history if provided
        if data.get('medical_history'):
            for history_data in data['medical_history']:
                history = MedicalHistory(
                    patient_id=patient.id,
                    condition=history_data.get('condition') or history_data.get('condition_name'),
                    condition_name=history_data.get('condition_name') or history_data.get('condition'),
                    diagnosis_date=datetime.datetime.strptime(history_data['diagnosis_date'], '%Y-%m-%d').date() if history_data.get('diagnosis_date') else None,
                    status=history_data.get('status', 'active'),
                    notes=history_data.get('notes')
                )
                db.session.add(history)
        
        # Add allergies if provided
        if data.get('allergies'):
            for allergy_data in data['allergies']:
                allergy = Allergy(
                    patient_id=patient.id,
                    allergen=allergy_data['allergen'],
                    reaction=allergy_data.get('reaction'),
                    severity=allergy_data.get('severity', 'moderate'),
                    notes=allergy_data.get('notes')
                )
                db.session.add(allergy)
        
        db.session.commit()
        
        # Log creation
        audit_log = AuditLog(
            log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
            user_id=request.current_user.id,
            action_type='patient_created',
            resource_type='patient',
            resource_id=patient.id,
            patient_id=patient.id,
            facility_id=facility_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            success=True,
            details=json.dumps({'patient_id': patient.universal_patient_id})
        )
        db.session.add(audit_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'patient': patient.to_dict(),
            'message': 'Patient created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to create patient: {str(e)}'}), 500

@patient_secure_bp.route('/<patient_id>', methods=['PUT'])
@token_required
@role_required(['Physician', 'Nurse', 'Facility Administrator', 'System Administrator'])
@tenant_isolation_required
def update_patient(patient_id):
    """Update patient record"""
    try:
        # Find patient
        patient = Patient.query.filter(
            db.or_(
                Patient.id == patient_id,
                Patient.universal_patient_id == patient_id
            )
        ).first()
        
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        # Check facility access
        user_facility_ids = [f['id'] for f in request.user_facilities if f['id'] is not None]
        if patient.facility_id not in user_facility_ids and 'System Administrator' not in [role['role_name'] for role in request.token_payload.get('roles', [])]:
            return jsonify({'error': 'Access denied to this patient'}), 403
        
        data = request.get_json()
        
        # Update patient fields
        updatable_fields = [
            'first_name', 'last_name', 'phone_primary', 'phone_secondary', 'email',
            'address_line1', 'address_line2', 'city', 'state', 'zip_code',
            'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
            'insurance_provider', 'insurance_policy_number', 'insurance_group_number',
            'allow_cross_facility_sharing'
        ]
        
        for field in updatable_fields:
            if field in data:
                setattr(patient, field, data[field])
        
        patient.updated_at = datetime.datetime.utcnow()
        patient.updated_by = request.current_user.id
        
        db.session.commit()
        
        # Log update
        audit_log = AuditLog(
            log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
            user_id=request.current_user.id,
            action_type='patient_updated',
            resource_type='patient',
            resource_id=patient.id,
            patient_id=patient.id,
            facility_id=patient.facility_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            success=True,
            details=json.dumps({'updated_fields': list(data.keys())})
        )
        db.session.add(audit_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'patient': patient.to_dict(),
            'message': 'Patient updated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update patient: {str(e)}'}), 500

# Patient Data Sharing and Consent Management

@patient_secure_bp.route('/<patient_id>/sharing-consent', methods=['POST'])
@token_required
def manage_sharing_consent(patient_id):
    """Manage patient's cross-facility data sharing consent"""
    try:
        # Find patient
        patient = Patient.query.filter(
            db.or_(
                Patient.id == patient_id,
                Patient.universal_patient_id == patient_id
            )
        ).first()
        
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        # Check if user is the patient or has appropriate permissions
        user_roles = [role['role_name'] for role in request.token_payload.get('roles', [])]
        
        if 'Patient' in user_roles:
            # Verify this is the patient's own record
            user_patient = Patient.query.filter_by(user_account_id=request.current_user.id).first()
            if not user_patient or user_patient.id != patient.id:
                return jsonify({'error': 'Access denied'}), 403
        elif not any(role in user_roles for role in ['Physician', 'System Administrator']):
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        data = request.get_json()
        allow_sharing = data.get('allow_cross_facility_sharing')
        
        if allow_sharing is None:
            return jsonify({'error': 'allow_cross_facility_sharing field required'}), 400
        
        patient.allow_cross_facility_sharing = allow_sharing
        patient.updated_at = datetime.datetime.utcnow()
        patient.updated_by = request.current_user.id
        
        db.session.commit()
        
        # Log consent change
        audit_log = AuditLog(
            log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
            user_id=request.current_user.id,
            action_type='sharing_consent_changed',
            resource_type='patient',
            resource_id=patient.id,
            patient_id=patient.id,
            facility_id=patient.facility_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            success=True,
            details=json.dumps({'allow_sharing': allow_sharing})
        )
        db.session.add(audit_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'allow_cross_facility_sharing': allow_sharing,
            'message': 'Sharing consent updated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update sharing consent: {str(e)}'}), 500

@patient_secure_bp.route('/<patient_id>/cross-facility-access', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def request_cross_facility_access(patient_id):
    """Request cross-facility access to patient data"""
    try:
        data = request.get_json()
        target_facility_id = data.get('target_facility_id')
        access_duration_hours = data.get('access_duration_hours', 24)
        
        if not target_facility_id:
            return jsonify({'error': 'target_facility_id required'}), 400
        
        # Find patient
        patient = Patient.query.filter(
            db.or_(
                Patient.id == patient_id,
                Patient.universal_patient_id == patient_id
            )
        ).first()
        
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        # Get user's current facility
        source_facility_id = request.token_payload.get('facility_id')
        
        # Create cross-facility access token
        result = CrossFacilityAccess.create_access_token(
            patient.id,
            source_facility_id,
            target_facility_id,
            request.current_user.id,
            access_duration_hours
        )
        
        if result['success']:
            # Log access request
            audit_log = AuditLog(
                log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
                user_id=request.current_user.id,
                action_type='cross_facility_access_requested',
                resource_type='patient',
                resource_id=patient.id,
                patient_id=patient.id,
                facility_id=source_facility_id,
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent'),
                success=True,
                details=json.dumps({
                    'target_facility_id': target_facility_id,
                    'access_token_id': result['access_token_id']
                })
            )
            db.session.add(audit_log)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'access_token_id': result['access_token_id'],
                'expires_at': result['expires_at'],
                'message': 'Cross-facility access granted'
            }), 200
        else:
            return jsonify({'error': result['error']}), 400
        
    except Exception as e:
        return jsonify({'error': f'Failed to request cross-facility access: {str(e)}'}), 500

# Patient Search and Discovery

@patient_secure_bp.route('/search', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'Facility Administrator', 'System Administrator'])
@tenant_isolation_required
def search_patients():
    """Advanced patient search with filters"""
    try:
        # Get search parameters
        query_text = request.args.get('q', '')
        age_min = request.args.get('age_min', type=int)
        age_max = request.args.get('age_max', type=int)
        gender = request.args.get('gender', '')
        facility_id = request.args.get('facility_id', type=int)
        has_allergies = request.args.get('has_allergies', type=bool)
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Build query with tenant isolation
        query = Patient.query.filter(Patient.is_active == True)
        
        # Apply data filter based on user's facility access
        if request.data_filter is not None:
            query = query.filter(request.data_filter)
        
        # Apply search filters
        if query_text:
            query = query.filter(
                db.or_(
                    Patient.first_name.ilike(f'%{query_text}%'),
                    Patient.last_name.ilike(f'%{query_text}%'),
                    Patient.universal_patient_id.ilike(f'%{query_text}%'),
                    Patient.email.ilike(f'%{query_text}%')
                )
            )
        
        if gender:
            query = query.filter(Patient.gender == gender)
        
        if facility_id:
            query = query.filter(Patient.facility_id == facility_id)
        
        # Age filtering (requires date calculation)
        if age_min or age_max:
            today = datetime.date.today()
            if age_max:
                min_birth_date = today - datetime.timedelta(days=(age_max + 1) * 365)
                query = query.filter(Patient.date_of_birth >= min_birth_date)
            if age_min:
                max_birth_date = today - datetime.timedelta(days=age_min * 365)
                query = query.filter(Patient.date_of_birth <= max_birth_date)
        
        # Allergy filtering
        if has_allergies is not None:
            if has_allergies:
                query = query.join(Allergy).filter(Allergy.patient_id == Patient.id)
            else:
                query = query.outerjoin(Allergy).filter(Allergy.patient_id.is_(None))
        
        # Execute query with pagination
        patients = query.order_by(Patient.last_name, Patient.first_name).paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        # Log search
        audit_log = AuditLog(
            log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
            user_id=request.current_user.id,
            action_type='patient_search',
            resource_type='patient',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            success=True,
            details={
                'search_query': query_text,
                'filters': {
                    'age_min': age_min,
                    'age_max': age_max,
                    'gender': gender,
                    'facility_id': facility_id,
                    'has_allergies': has_allergies
                },
                'results_count': patients.total
            }
        )
        db.session.add(audit_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'patients': [patient.to_dict() for patient in patients.items],
            'total': patients.total,
            'pages': patients.pages,
            'current_page': page,
            'search_params': {
                'query': query_text,
                'age_min': age_min,
                'age_max': age_max,
                'gender': gender,
                'facility_id': facility_id,
                'has_allergies': has_allergies
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Patient search failed: {str(e)}'}), 500

@patient_secure_bp.route('/me/records', methods=['GET'])
@token_required
def get_my_records():
    """Get current patient's medical records"""
    try:
        # Return empty records for now - this would normally fetch from database
        return jsonify({
            'success': True,
            'records': [],
            'message': 'No records found'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

