"""
Secure Medical Data Management API Routes for MedConnect
Handles allergies, medications, medical history with proper access controls
"""

from flask import Blueprint, request, jsonify
from auth.jwt_manager import token_required, role_required
from auth.tenant_middleware import tenant_isolation_required, CrossFacilityAccess
from models.patient import Patient, MedicalHistory, Allergy, Medication
from models.auth import AuditLog
from database import db
import datetime
import uuid

medical_data_bp = Blueprint('medical_data', __name__)

# Medical History Management

@medical_data_bp.route('/patients/<patient_id>/medical-history', methods=['GET'])
@token_required
@tenant_isolation_required
def get_medical_history(patient_id):
    """Get patient's medical history"""
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
        
        # Check access permissions
        user_roles = [role['role_name'] for role in request.token_payload.get('roles', [])]
        
        # Patients can only access their own data
        if 'Patient' in user_roles and 'System Administrator' not in user_roles:
            user_patient = Patient.query.filter_by(user_account_id=request.current_user.id).first()
            if not user_patient or user_patient.id != patient.id:
                return jsonify({'error': 'Access denied'}), 403
        
        # Check facility access for providers
        elif not any(role in user_roles for role in ['System Administrator']):
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
        
        # Get medical history
        medical_history = MedicalHistory.query.filter_by(
            patient_id=patient.id,
            is_active=True
        ).order_by(MedicalHistory.diagnosis_date.desc()).all()
        
        # Log access
        audit_log = AuditLog(
            log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
            user_id=request.current_user.id,
            action_type='medical_history_access',
            resource_type='medical_history',
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
            'medical_history': [history.to_dict() for history in medical_history],
            'patient_id': patient.universal_patient_id
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to get medical history: {str(e)}'}), 500

@medical_data_bp.route('/patients/<patient_id>/medical-history', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
@tenant_isolation_required
def add_medical_history(patient_id):
    """Add new medical history entry"""
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
        
        # Validate required fields
        if not data.get('condition'):
            return jsonify({'error': 'condition is required'}), 400
        
        # Create medical history entry
        history = MedicalHistory(
            patient_id=patient.id,
            condition=data['condition'],
            diagnosis_date=datetime.datetime.strptime(data['diagnosis_date'], '%Y-%m-%d').date() if data.get('diagnosis_date') else None,
            status=data.get('status', 'active'),
            notes=data.get('notes'),
            diagnosed_by=request.current_user.id,
            created_at=datetime.datetime.utcnow()
        )
        
        db.session.add(history)
        db.session.commit()
        
        # Log creation
        audit_log = AuditLog(
            log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
            user_id=request.current_user.id,
            action_type='medical_history_added',
            resource_type='medical_history',
            resource_id=history.id,
            patient_id=patient.id,
            facility_id=patient.facility_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            success=True,
            details={'condition': data['condition']}
        )
        db.session.add(audit_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'medical_history': history.to_dict(),
            'message': 'Medical history added successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to add medical history: {str(e)}'}), 500

# Allergy Management

@medical_data_bp.route('/patients/<patient_id>/allergies', methods=['GET'])
@token_required
@tenant_isolation_required
def get_allergies(patient_id):
    """Get patient's allergies"""
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
        
        # Check access permissions (same logic as medical history)
        user_roles = [role['role_name'] for role in request.token_payload.get('roles', [])]
        
        if 'Patient' in user_roles and 'System Administrator' not in user_roles:
            user_patient = Patient.query.filter_by(user_account_id=request.current_user.id).first()
            if not user_patient or user_patient.id != patient.id:
                return jsonify({'error': 'Access denied'}), 403
        elif not any(role in user_roles for role in ['System Administrator']):
            user_facility_ids = [f['id'] for f in request.user_facilities if f['id'] is not None]
            if patient.facility_id not in user_facility_ids:
                access_result = CrossFacilityAccess.verify_cross_facility_access(
                    patient.id, 
                    request.token_payload.get('facility_id'),
                    patient.facility_id
                )
                if not access_result['success']:
                    return jsonify({'error': 'Cross-facility access required'}), 403
        
        # Get allergies
        allergies = Allergy.query.filter_by(
            patient_id=patient.id,
            is_active=True
        ).order_by(Allergy.severity.desc(), Allergy.allergen).all()
        
        # Log access
        audit_log = AuditLog(
            log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
            user_id=request.current_user.id,
            action_type='allergies_access',
            resource_type='allergy',
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
            'allergies': [allergy.to_dict() for allergy in allergies],
            'patient_id': patient.universal_patient_id
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to get allergies: {str(e)}'}), 500

@medical_data_bp.route('/patients/<patient_id>/allergies', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
@tenant_isolation_required
def add_allergy(patient_id):
    """Add new allergy"""
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
        
        # Validate required fields
        if not data.get('allergen'):
            return jsonify({'error': 'allergen is required'}), 400
        
        # Check for duplicate allergy
        existing_allergy = Allergy.query.filter_by(
            patient_id=patient.id,
            allergen=data['allergen'],
            is_active=True
        ).first()
        
        if existing_allergy:
            return jsonify({'error': 'Allergy already exists for this patient'}), 400
        
        # Create allergy entry
        allergy = Allergy(
            patient_id=patient.id,
            allergen=data['allergen'],
            reaction=data.get('reaction'),
            severity=data.get('severity', 'moderate'),
            notes=data.get('notes'),
            recorded_by=request.current_user.id,
            created_at=datetime.datetime.utcnow()
        )
        
        db.session.add(allergy)
        db.session.commit()
        
        # Log creation
        audit_log = AuditLog(
            log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
            user_id=request.current_user.id,
            action_type='allergy_added',
            resource_type='allergy',
            resource_id=allergy.id,
            patient_id=patient.id,
            facility_id=patient.facility_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            success=True,
            details={'allergen': data['allergen'], 'severity': allergy.severity}
        )
        db.session.add(audit_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'allergy': allergy.to_dict(),
            'message': 'Allergy added successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to add allergy: {str(e)}'}), 500

# Medication Management

@medical_data_bp.route('/patients/<patient_id>/medications', methods=['GET'])
@token_required
@tenant_isolation_required
def get_medications(patient_id):
    """Get patient's medications"""
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
        
        # Check access permissions
        user_roles = [role['role_name'] for role in request.token_payload.get('roles', [])]
        
        if 'Patient' in user_roles and 'System Administrator' not in user_roles:
            user_patient = Patient.query.filter_by(user_account_id=request.current_user.id).first()
            if not user_patient or user_patient.id != patient.id:
                return jsonify({'error': 'Access denied'}), 403
        elif not any(role in user_roles for role in ['System Administrator']):
            user_facility_ids = [f['id'] for f in request.user_facilities if f['id'] is not None]
            if patient.facility_id not in user_facility_ids:
                access_result = CrossFacilityAccess.verify_cross_facility_access(
                    patient.id, 
                    request.token_payload.get('facility_id'),
                    patient.facility_id
                )
                if not access_result['success']:
                    return jsonify({'error': 'Cross-facility access required'}), 403
        
        # Get medications
        status_filter = request.args.get('status', 'active')
        
        query = Medication.query.filter_by(patient_id=patient.id)
        
        if status_filter == 'active':
            query = query.filter_by(is_active=True)
        elif status_filter == 'inactive':
            query = query.filter_by(is_active=False)
        # 'all' shows both active and inactive
        
        medications = query.order_by(Medication.medication_name).all()
        
        # Log access
        audit_log = AuditLog(
            log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
            user_id=request.current_user.id,
            action_type='medications_access',
            resource_type='medication',
            patient_id=patient.id,
            facility_id=patient.facility_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            success=True,
            details={'status_filter': status_filter}
        )
        db.session.add(audit_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'medications': [medication.to_dict() for medication in medications],
            'patient_id': patient.universal_patient_id,
            'status_filter': status_filter
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to get medications: {str(e)}'}), 500

@medical_data_bp.route('/patients/<patient_id>/medications', methods=['POST'])
@token_required
@role_required(['Physician', 'Pharmacist', 'System Administrator'])
@tenant_isolation_required
def add_medication(patient_id):
    """Add new medication"""
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
        
        # Validate required fields
        required_fields = ['medication_name', 'dosage', 'frequency']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Create medication entry
        medication = Medication(
            patient_id=patient.id,
            medication_name=data['medication_name'],
            dosage=data['dosage'],
            frequency=data['frequency'],
            route=data.get('route', 'oral'),
            start_date=datetime.datetime.strptime(data['start_date'], '%Y-%m-%d').date() if data.get('start_date') else datetime.date.today(),
            end_date=datetime.datetime.strptime(data['end_date'], '%Y-%m-%d').date() if data.get('end_date') else None,
            prescribing_provider=data.get('prescribing_provider'),
            notes=data.get('notes'),
            prescribed_by=request.current_user.id,
            created_at=datetime.datetime.utcnow()
        )
        
        db.session.add(medication)
        db.session.commit()
        
        # Log creation
        audit_log = AuditLog(
            log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
            user_id=request.current_user.id,
            action_type='medication_added',
            resource_type='medication',
            resource_id=medication.id,
            patient_id=patient.id,
            facility_id=patient.facility_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            success=True,
            details={
                'medication_name': data['medication_name'],
                'dosage': data['dosage'],
                'frequency': data['frequency']
            }
        )
        db.session.add(audit_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'medication': medication.to_dict(),
            'message': 'Medication added successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to add medication: {str(e)}'}), 500

@medical_data_bp.route('/patients/<patient_id>/medications/<medication_id>', methods=['PUT'])
@token_required
@role_required(['Physician', 'Pharmacist', 'System Administrator'])
@tenant_isolation_required
def update_medication(patient_id, medication_id):
    """Update medication (e.g., discontinue, change dosage)"""
    try:
        # Find patient and medication
        patient = Patient.query.filter(
            db.or_(
                Patient.id == patient_id,
                Patient.universal_patient_id == patient_id
            )
        ).first()
        
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        medication = Medication.query.filter_by(
            id=medication_id,
            patient_id=patient.id
        ).first()
        
        if not medication:
            return jsonify({'error': 'Medication not found'}), 404
        
        # Check facility access
        user_facility_ids = [f['id'] for f in request.user_facilities if f['id'] is not None]
        if patient.facility_id not in user_facility_ids and 'System Administrator' not in [role['role_name'] for role in request.token_payload.get('roles', [])]:
            return jsonify({'error': 'Access denied to this patient'}), 403
        
        data = request.get_json()
        
        # Track changes for audit
        changes = {}
        
        # Update medication fields
        updatable_fields = ['dosage', 'frequency', 'route', 'end_date', 'notes', 'is_active']
        
        for field in updatable_fields:
            if field in data:
                old_value = getattr(medication, field)
                new_value = data[field]
                
                if field == 'end_date' and new_value:
                    new_value = datetime.datetime.strptime(new_value, '%Y-%m-%d').date()
                
                if old_value != new_value:
                    changes[field] = {'old': str(old_value), 'new': str(new_value)}
                    setattr(medication, field, new_value)
        
        if changes:
            medication.updated_at = datetime.datetime.utcnow()
            medication.updated_by = request.current_user.id
            
            db.session.commit()
            
            # Log update
            audit_log = AuditLog(
                log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
                user_id=request.current_user.id,
                action_type='medication_updated',
                resource_type='medication',
                resource_id=medication.id,
                patient_id=patient.id,
                facility_id=patient.facility_id,
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent'),
                success=True,
                details={
                    'medication_name': medication.medication_name,
                    'changes': changes
                }
            )
            db.session.add(audit_log)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'medication': medication.to_dict(),
                'changes': changes,
                'message': 'Medication updated successfully'
            }), 200
        else:
            return jsonify({
                'success': True,
                'medication': medication.to_dict(),
                'message': 'No changes made'
            }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update medication: {str(e)}'}), 500

# Patient Summary and Dashboard

@medical_data_bp.route('/patients/<patient_id>/summary', methods=['GET'])
@token_required
@tenant_isolation_required
def get_patient_summary(patient_id):
    """Get comprehensive patient medical summary"""
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
        
        # Check access permissions
        user_roles = [role['role_name'] for role in request.token_payload.get('roles', [])]
        
        if 'Patient' in user_roles and 'System Administrator' not in user_roles:
            user_patient = Patient.query.filter_by(user_account_id=request.current_user.id).first()
            if not user_patient or user_patient.id != patient.id:
                return jsonify({'error': 'Access denied'}), 403
        elif not any(role in user_roles for role in ['System Administrator']):
            user_facility_ids = [f['id'] for f in request.user_facilities if f['id'] is not None]
            if patient.facility_id not in user_facility_ids:
                access_result = CrossFacilityAccess.verify_cross_facility_access(
                    patient.id, 
                    request.token_payload.get('facility_id'),
                    patient.facility_id
                )
                if not access_result['success']:
                    return jsonify({'error': 'Cross-facility access required'}), 403
        
        # Gather summary data
        summary = {
            'patient': patient.to_dict(),
            'active_medications': Medication.query.filter_by(
                patient_id=patient.id, 
                is_active=True
            ).count(),
            'known_allergies': Allergy.query.filter_by(
                patient_id=patient.id, 
                is_active=True
            ).count(),
            'medical_conditions': MedicalHistory.query.filter_by(
                patient_id=patient.id, 
                is_active=True,
                status='active'
            ).count(),
            'critical_allergies': Allergy.query.filter_by(
                patient_id=patient.id, 
                is_active=True,
                severity='severe'
            ).all(),
            'current_medications': Medication.query.filter_by(
                patient_id=patient.id, 
                is_active=True
            ).limit(10).all(),
            'active_conditions': MedicalHistory.query.filter_by(
                patient_id=patient.id, 
                is_active=True,
                status='active'
            ).limit(10).all()
        }
        
        # Convert to dict format
        summary['critical_allergies'] = [allergy.to_dict() for allergy in summary['critical_allergies']]
        summary['current_medications'] = [med.to_dict() for med in summary['current_medications']]
        summary['active_conditions'] = [condition.to_dict() for condition in summary['active_conditions']]
        
        # Log access
        audit_log = AuditLog(
            log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
            user_id=request.current_user.id,
            action_type='patient_summary_access',
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
            'summary': summary
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to get patient summary: {str(e)}'}), 500

