"""
OTP Authorization Routes
Handles OTP generation by patients and verification by providers for patient data access
"""
from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.patient import Patient
from src.models.provider import Provider
from src.models.auth import PatientOTP, AuditLog
from src.services.notification_service import notification_service
from datetime import datetime, timedelta
import random
import uuid

otp_bp = Blueprint('otp', __name__)

# OTP Configuration
OTP_EXPIRY_MINUTES = 15  # OTP expires in 15 minutes
OTP_LENGTH = 6  # 6-digit OTP

def generate_otp():
    """Generate a random 6-digit OTP"""
    return ''.join([str(random.randint(0, 9)) for _ in range(OTP_LENGTH)])

# Patient generates OTP for provider access
@otp_bp.route('/patient/generate', methods=['POST'])
@token_required
@role_required(['Patient', 'System Administrator'])
def generate_patient_otp():
    """Patient generates an OTP that providers can use to access their data"""
    try:
        data = request.get_json()
        patient_id = data.get('patient_id')
        
        # Get current user's patient record
        user_roles = [role['role_name'] for role in request.token_payload.get('roles', [])]
        
        # If not admin, verify patient owns this record
        if 'System Administrator' not in user_roles:
            patient = Patient.query.filter_by(
                id=patient_id,
                user_account_id=request.current_user.id
            ).first()
            
            if not patient:
                return jsonify({
                    'success': False,
                    'error': 'Patient not found or access denied'
                }), 404
        else:
            patient = Patient.query.get_or_404(patient_id)
        
        # Get phone number to send OTP to
        phone_number = data.get('phone_number') or patient.phone_primary
        
        if not phone_number:
            return jsonify({
                'success': False,
                'error': 'Phone number is required to send OTP'
            }), 400
        
        # Optional: provider/facility ID if generating for specific provider
        provider_id = data.get('provider_id')
        facility_id = data.get('facility_id') or request.token_payload.get('facility_id')
        
        # Access scope - what data can be accessed
        access_scope = data.get('access_scope', [
            'demographics',
            'medical_history',
            'allergies',
            'medications',
            'lab_results',
            'encounters'
        ])
        
        # Generate OTP
        otp_code = generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRY_MINUTES)
        
        # Create OTP record
        otp = PatientOTP(
            otp_code=otp_code,
            patient_id=patient.id,
            provider_id=provider_id,
            facility_id=facility_id,
            phone_number=phone_number,
            expires_at=expires_at,
            access_scope=str(access_scope) if isinstance(access_scope, list) else access_scope,
            is_active=True,
            is_used=False
        )
        
        db.session.add(otp)
        db.session.commit()
        
        # Send OTP via SMS
        message = f"Your Clinic+ authorization code is {otp_code}. This code expires in {OTP_EXPIRY_MINUTES} minutes. Do not share this code with anyone."
        sms_result = notification_service.send_sms(phone_number, message)
        
        # Log the action
        audit_log = AuditLog(
            log_id=f"OTP-GEN-{uuid.uuid4().hex[:8]}",
            user_id=request.current_user.id,
            action_type='generate_otp',
            resource_type='patient_otp',
            resource_id=str(otp.id),
            patient_id=patient.id,
            endpoint='/api/otp/patient/generate',
            http_method='POST',
            success=True,
            facility_id=facility_id
        )
        db.session.add(audit_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'OTP generated and sent successfully',
            'otp_id': otp.id,
            'expires_at': expires_at.isoformat(),
            'sms_sent': sms_result.get('success', False),
            'phone_number': phone_number[-4:].rjust(len(phone_number), '*')  # Mask phone number
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Provider verifies OTP to access patient data
@otp_bp.route('/provider/verify', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse', 'Pharmacist', 'Lab Technician', 'System Administrator'])
def verify_provider_otp():
    """Provider verifies OTP to gain access to patient data"""
    try:
        data = request.get_json()
        otp_code = data.get('otp_code')
        patient_id = data.get('patient_id')
        
        if not otp_code or not patient_id:
            return jsonify({
                'success': False,
                'error': 'OTP code and patient ID are required'
            }), 400
        
        # Find the OTP
        otp = PatientOTP.query.filter_by(
            otp_code=otp_code,
            patient_id=patient_id,
            is_active=True
        ).order_by(PatientOTP.created_at.desc()).first()
        
        if not otp:
            return jsonify({
                'success': False,
                'error': 'Invalid OTP code'
            }), 404
        
        # Check if OTP is valid
        if not otp.is_valid():
            otp.verification_attempts += 1
            db.session.commit()
            
            reason = 'expired' if otp.is_expired() else 'already used' if otp.is_used else 'max attempts exceeded'
            return jsonify({
                'success': False,
                'error': f'OTP is {reason}',
                'is_expired': otp.is_expired(),
                'is_used': otp.is_used,
                'attempts_remaining': max(0, otp.max_attempts - otp.verification_attempts)
            }), 400
        
        # Verify OTP matches
        if otp.otp_code != otp_code:
            otp.verification_attempts += 1
            db.session.commit()
            
            return jsonify({
                'success': False,
                'error': 'Invalid OTP code',
                'attempts_remaining': max(0, otp.max_attempts - otp.verification_attempts)
            }), 400
        
        # Mark OTP as used
        otp.is_used = True
        otp.verified_at = datetime.utcnow()
        otp.verified_by_provider_id = request.current_user.provider_id if hasattr(request.current_user, 'provider_id') else None
        
        # Get provider info
        provider = Provider.query.filter_by(user_account_id=request.current_user.id).first()
        if provider:
            otp.verified_by_provider_id = provider.id
        
        db.session.commit()
        
        # Log successful verification
        audit_log = AuditLog(
            log_id=f"OTP-VER-{uuid.uuid4().hex[:8]}",
            user_id=request.current_user.id,
            action_type='verify_otp',
            resource_type='patient_otp',
            resource_id=str(otp.id),
            patient_id=patient_id,
            endpoint='/api/otp/provider/verify',
            http_method='POST',
            success=True,
            facility_id=otp.facility_id
        )
        db.session.add(audit_log)
        db.session.commit()
        
        # Return access token/session info
        return jsonify({
            'success': True,
            'message': 'OTP verified successfully',
            'patient_id': patient_id,
            'access_granted': True,
            'access_scope': otp.access_scope,
            'verified_at': otp.verified_at.isoformat(),
            'expires_at': otp.expires_at.isoformat()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Check if OTP verification is required for patient access
@otp_bp.route('/patient/<int:patient_id>/verification-status', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'Pharmacist', 'Lab Technician', 'System Administrator'])
def check_verification_status(patient_id):
    """Check if provider has verified OTP for accessing patient data"""
    try:
        # Get provider info
        provider = Provider.query.filter_by(user_account_id=request.current_user.id).first()
        facility_id = request.token_payload.get('facility_id')

        # Check for valid verified OTP scoped to provider/facility access.
        base_query = PatientOTP.query.filter(
            PatientOTP.patient_id == patient_id,
            PatientOTP.is_used == True,
            PatientOTP.is_active == True,
            PatientOTP.verified_at.isnot(None)
        )
        scope_filters = [PatientOTP.provider_id.is_(None)]
        if provider:
            scope_filters.append(PatientOTP.provider_id == provider.id)
        if facility_id:
            scope_filters.append(PatientOTP.facility_id == facility_id)
        verified_otp = base_query.filter(db.or_(*scope_filters)).order_by(PatientOTP.verified_at.desc()).first()
        
        if verified_otp:
            # Verification window is bounded by configured session duration and OTP expiry.
            verification_valid_duration = timedelta(hours=1)
            if verified_otp.verified_at and (datetime.utcnow() - verified_otp.verified_at) < verification_valid_duration:
                return jsonify({
                    'success': True,
                    'verified': True,
                    'verified_at': verified_otp.verified_at.isoformat(),
                    'access_scope': verified_otp.access_scope
                }), 200
        
        return jsonify({
            'success': True,
            'verified': False,
            'message': 'OTP verification required to access patient data'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Get active OTPs for a patient (for patient to see)
@otp_bp.route('/patient/<int:patient_id>/active-otps', methods=['GET'])
@token_required
@role_required(['Patient', 'System Administrator'])
def get_active_otps(patient_id):
    """Get active OTPs for a patient"""
    try:
        # Verify patient owns this record
        user_roles = [role['role_name'] for role in request.token_payload.get('roles', [])]
        if 'System Administrator' not in user_roles:
            patient = Patient.query.filter_by(
                id=patient_id,
                user_account_id=request.current_user.id
            ).first()
            if not patient:
                return jsonify({
                    'success': False,
                    'error': 'Access denied'
                }), 403
        else:
            patient = Patient.query.get_or_404(patient_id)
        
        # Get active OTPs
        active_otps = PatientOTP.query.filter(
            PatientOTP.patient_id == patient_id,
            PatientOTP.is_active == True,
            PatientOTP.is_used == False,
            PatientOTP.expires_at > datetime.utcnow()
        ).order_by(PatientOTP.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'otps': [otp.to_dict() for otp in active_otps]
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Revoke an OTP
@otp_bp.route('/patient/<int:patient_id>/otp/<int:otp_id>/revoke', methods=['POST'])
@token_required
@role_required(['Patient', 'System Administrator'])
def revoke_otp(patient_id, otp_id):
    """Revoke an active OTP"""
    try:
        # Verify patient owns this record
        user_roles = [role['role_name'] for role in request.token_payload.get('roles', [])]
        if 'System Administrator' not in user_roles:
            patient = Patient.query.filter_by(
                id=patient_id,
                user_account_id=request.current_user.id
            ).first()
            if not patient:
                return jsonify({
                    'success': False,
                    'error': 'Access denied'
                }), 403
        
        otp = PatientOTP.query.filter_by(
            id=otp_id,
            patient_id=patient_id
        ).first_or_404()
        
        otp.is_active = False
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'OTP revoked successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

