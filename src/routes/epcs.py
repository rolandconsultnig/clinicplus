"""
EPCS (Electronic Prescribing of Controlled Substances) Routes
DEA-compliant electronic prescribing
"""
from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.middleware.hipaa_audit import hipaa_audit_required, log_phi_access
from src.models.user import db
from src.models.prescribing import Prescription, Drug
from src.models.provider import Provider
from src.models.patient import Patient
from src.services.epcs import epcs_service
from datetime import datetime
import uuid

epcs_bp = Blueprint('epcs', __name__)

@epcs_bp.route('/verify-dea', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant', 'System Administrator'])
def verify_dea():
    """Verify provider DEA number for EPCS eligibility"""
    try:
        data = request.get_json()
        provider_id = data.get('provider_id')
        dea_number = data.get('dea_number')
        
        if not provider_id or not dea_number:
            return jsonify({'error': 'Provider ID and DEA number are required'}), 400
        
        is_valid, verification = epcs_service.verify_provider_dea(provider_id, dea_number)
        
        if is_valid:
            return jsonify({
                'success': True,
                'verified': True,
                'verification': verification
            }), 200
        else:
            return jsonify({
                'success': False,
                'verified': False,
                'error': verification.get('error', 'DEA verification failed')
            }), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@epcs_bp.route('/create-prescription', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant'])
@hipaa_audit_required(action_type='create', resource_type='epcs_prescription')
def create_epcs_prescription():
    """Create EPCS prescription for controlled substances"""
    try:
        data = request.get_json()
        
        # Validate prescription data
        is_valid, errors = epcs_service.validate_epcs_prescription(data)
        if not is_valid:
            return jsonify({
                'success': False,
                'error': 'Prescription validation failed',
                'errors': errors
            }), 400
        
        # Add created_by from current user
        data['created_by'] = request.current_user.id
        
        # Create EPCS prescription
        success, prescription_id, result = epcs_service.create_epcs_prescription(data)
        
        if success:
            # Log PHI access
            log_phi_access(
                patient_id=data.get('patient_id'),
                resource_type='epcs_prescription',
                resource_id=prescription_id,
                action='create',
                details={'drug_schedule': result.get('epcs_audit', {}).get('drug_schedule')}
            )
            
            return jsonify({
                'success': True,
                'prescription_id': result.get('prescription_id'),
                'epcs_audit': result.get('epcs_audit'),
                'message': result.get('message')
            }), 201
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Failed to create EPCS prescription')
            }), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@epcs_bp.route('/verify-patient-identity', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant'])
@hipaa_audit_required(action_type='verify', resource_type='patient_identity')
def verify_patient_identity():
    """Verify patient identity for EPCS (DEA requirement)"""
    try:
        data = request.get_json()
        patient_id = data.get('patient_id')
        verification_method = data.get('verification_method', 'system')
        
        if not patient_id:
            return jsonify({'error': 'Patient ID is required'}), 400
        
        is_verified, verification = epcs_service.verify_patient_identity(
            patient_id,
            verification_method
        )
        
        if is_verified:
            return jsonify({
                'success': True,
                'verified': True,
                'verification': verification
            }), 200
        else:
            return jsonify({
                'success': False,
                'verified': False,
                'error': verification.get('error', 'Patient identity verification failed')
            }), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@epcs_bp.route('/check-drug-schedule/<int:drug_id>', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant'])
def check_drug_schedule(drug_id):
    """Check if drug is controlled and get schedule restrictions"""
    try:
        is_controlled, schedule, restrictions = epcs_service.check_drug_schedule(drug_id)
        
        return jsonify({
            'success': True,
            'is_controlled': is_controlled,
            'schedule': schedule,
            'restrictions': restrictions
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@epcs_bp.route('/prescriptions/<int:prescription_id>/audit', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'System Administrator'])
@hipaa_audit_required(action_type='view', resource_type='epcs_audit')
def get_epcs_audit(prescription_id):
    """Get EPCS audit trail for a prescription"""
    try:
        prescription = Prescription.query.get_or_404(prescription_id)
        
        if not prescription.dea_required:
            return jsonify({
                'success': False,
                'error': 'Prescription is not an EPCS prescription'
            }), 400
        
        audit_data = {
            'prescription_id': prescription.prescription_id,
            'provider_id': prescription.provider_id,
            'patient_id': prescription.patient_id,
            'drug_name': prescription.drug_name,
            'dea_required': prescription.dea_required,
            'dea_verified': prescription.dea_verified,
            'prescribed_date': prescription.prescribed_date.isoformat() if prescription.prescribed_date else None,
            'created_at': prescription.created_at.isoformat() if prescription.created_at else None
        }
        
        # Get provider DEA info
        provider = Provider.query.get(prescription.provider_id)
        if provider:
            audit_data['provider_dea'] = provider.dea_number
            audit_data['provider_name'] = f"{provider.first_name} {provider.last_name}"
        
        # Get drug schedule
        drug = Drug.query.get(prescription.drug_id)
        if drug:
            audit_data['drug_schedule'] = drug.schedule
            audit_data['is_controlled'] = drug.is_controlled
        
        return jsonify({
            'success': True,
            'audit': audit_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@epcs_bp.route('/compliance-report', methods=['GET'])
@token_required
@role_required(['System Administrator', 'Facility Administrator'])
def get_epcs_compliance_report():
    """Get EPCS compliance report"""
    try:
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        provider_id = request.args.get('provider_id', type=int)
        
        query = Prescription.query.filter(Prescription.dea_required == True)
        
        if date_from:
            query = query.filter(Prescription.prescribed_date >= datetime.fromisoformat(date_from).date())
        if date_to:
            query = query.filter(Prescription.prescribed_date <= datetime.fromisoformat(date_to).date())
        if provider_id:
            query = query.filter(Prescription.provider_id == provider_id)
        
        epcs_prescriptions = query.all()
        
        # Calculate compliance metrics
        total_prescriptions = len(epcs_prescriptions)
        verified_prescriptions = sum(1 for rx in epcs_prescriptions if rx.dea_verified)
        compliance_rate = (verified_prescriptions / total_prescriptions * 100) if total_prescriptions > 0 else 0
        
        # Group by schedule
        schedule_counts = {}
        for rx in epcs_prescriptions:
            drug = Drug.query.get(rx.drug_id)
            if drug and drug.schedule:
                schedule = drug.schedule
                schedule_counts[schedule] = schedule_counts.get(schedule, 0) + 1
        
        return jsonify({
            'success': True,
            'report': {
                'total_epcs_prescriptions': total_prescriptions,
                'verified_prescriptions': verified_prescriptions,
                'unverified_prescriptions': total_prescriptions - verified_prescriptions,
                'compliance_rate': round(compliance_rate, 2),
                'schedule_distribution': schedule_counts,
                'period': {
                    'from': date_from,
                    'to': date_to
                }
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

