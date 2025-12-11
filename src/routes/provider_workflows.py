"""
Healthcare Provider Workflow API Routes for Clinic+
Specialized interfaces for doctors, nurses, pharmacists, lab technicians, and radiographers
"""

from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.auth.tenant_middleware import tenant_isolation_required, CrossFacilityAccess
from src.models.user import db
from src.models.patient import Patient, Medication
from src.models.clinical import ClinicalEncounter, VitalSigns, ClinicalNote, LabOrder, LabResult
from src.models.provider import Provider
from src.models.auth import AuditLog
import datetime
import uuid

provider_workflows_bp = Blueprint('provider_workflows', __name__)

# Physician Workflows

@provider_workflows_bp.route('/physician/dashboard', methods=['GET'])
@token_required
@role_required(['Physician', 'System Administrator'])
@tenant_isolation_required
def physician_dashboard():
    """Get physician dashboard with patient overview and tasks"""
    try:
        # Get current provider
        provider = Provider.query.filter_by(user_account_id=request.current_user.id).first()
        if not provider:
            return jsonify({'error': 'Provider profile not found'}), 404
        
        # Get facility context
        facility_id = request.token_payload.get('facility_id')
        
        # Get today's appointments/encounters
        today = datetime.date.today()
        todays_encounters = ClinicalEncounter.query.filter(
            ClinicalEncounter.provider_id == provider.id,
            db.cast(ClinicalEncounter.encounter_date, db.Date) == today,
            ClinicalEncounter.facility_id == facility_id
        ).all()
        
        # Get pending lab orders
        pending_labs = LabOrder.query.filter(
            LabOrder.ordering_provider_id == provider.id,
            LabOrder.status.in_(['pending', 'in_progress']),
            LabOrder.facility_id == facility_id
        ).count()
        
        # Get patients requiring follow-up
        follow_up_encounters = ClinicalEncounter.query.filter(
            ClinicalEncounter.provider_id == provider.id,
            ClinicalEncounter.follow_up_required == True,
            ClinicalEncounter.follow_up_date <= datetime.date.today() + datetime.timedelta(days=7),
            ClinicalEncounter.facility_id == facility_id
        ).all()
        
        # Get recent patients
        recent_patients = db.session.query(Patient).join(ClinicalEncounter).filter(
            ClinicalEncounter.provider_id == provider.id,
            ClinicalEncounter.facility_id == facility_id
        ).order_by(ClinicalEncounter.encounter_date.desc()).limit(10).all()
        
        dashboard_data = {
            'provider': provider.to_dict(),
            'today_stats': {
                'scheduled_encounters': len(todays_encounters),
                'pending_lab_orders': pending_labs,
                'follow_up_patients': len(follow_up_encounters)
            },
            'todays_encounters': [encounter.to_dict() for encounter in todays_encounters],
            'follow_up_patients': [
                {
                    'encounter': encounter.to_dict(),
                    'patient': encounter.patient.to_dict() if encounter.patient else None
                }
                for encounter in follow_up_encounters
            ],
            'recent_patients': [patient.to_dict() for patient in recent_patients]
        }
        
        return jsonify({
            'success': True,
            'dashboard': dashboard_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to load physician dashboard: {str(e)}'}), 500

@provider_workflows_bp.route('/physician/encounter', methods=['POST'])
@token_required
@role_required(['Physician', 'System Administrator'])
@tenant_isolation_required
def create_clinical_encounter():
    """Create new clinical encounter"""
    try:
        data = request.get_json()
        
        # Get current provider
        provider = Provider.query.filter_by(user_account_id=request.current_user.id).first()
        if not provider:
            return jsonify({'error': 'Provider profile not found'}), 404
        
        # Validate required fields
        required_fields = ['patient_id', 'encounter_type']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Find patient
        patient = Patient.query.filter(
            db.or_(
                Patient.id == data['patient_id'],
                Patient.universal_patient_id == data['patient_id']
            )
        ).first()
        
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        # Parse encounter date
        encounter_date_str = data.get('encounter_date', datetime.date.today().isoformat())
        if isinstance(encounter_date_str, str):
            encounter_date = datetime.datetime.strptime(encounter_date_str, '%Y-%m-%d')
        else:
            encounter_date = datetime.datetime.combine(encounter_date_str, datetime.time.min)
        
        # Create clinical encounter
        encounter = ClinicalEncounter(
            encounter_id=f"ENC-{uuid.uuid4().hex[:8].upper()}",
            patient_id=patient.id,
            provider_id=provider.id,
            facility_id=request.token_payload.get('facility_id'),
            encounter_type=data['encounter_type'],
            encounter_date=encounter_date,
            encounter_status=data.get('encounter_status', 'completed'),
            chief_complaint=data.get('chief_complaint'),
            assessment=data.get('diagnosis') or data.get('assessment'),
            diagnosis=data.get('diagnosis'),
            plan=data.get('treatment_plan') or data.get('plan'),
            treatment_plan=data.get('treatment_plan'),
            follow_up_required=data.get('follow_up_required', False),
            follow_up_date=datetime.datetime.strptime(data['follow_up_date'], '%Y-%m-%d').date() if data.get('follow_up_date') else None,
            notes=data.get('notes'),
            created_at=datetime.datetime.utcnow()
        )
        
        db.session.add(encounter)
        db.session.flush()  # Get the ID
        
        # Add vital signs if provided
        if data.get('vital_signs'):
            vitals_data = data['vital_signs']
            vitals = VitalSigns(
                patient_id=patient.id,
                encounter_id=encounter.id,
                systolic_bp=vitals_data.get('systolic_bp'),
                diastolic_bp=vitals_data.get('diastolic_bp'),
                heart_rate=vitals_data.get('heart_rate'),
                temperature=vitals_data.get('temperature'),
                respiratory_rate=vitals_data.get('respiratory_rate'),
                oxygen_saturation=vitals_data.get('oxygen_saturation'),
                weight=vitals_data.get('weight'),
                weight_pounds=vitals_data.get('weight'),
                height=vitals_data.get('height'),
                height_inches=vitals_data.get('height'),
                recorded_by=request.current_user.id,
                recorded_at=datetime.datetime.utcnow()
            )
            db.session.add(vitals)
        
        # Add clinical notes if provided
        if data.get('clinical_notes'):
            for note_data in data['clinical_notes']:
                note = ClinicalNote(
                    patient_id=patient.id,
                    encounter_id=encounter.id,
                    note_type=note_data.get('note_type', 'progress'),
                    note_content=note_data.get('content') or note_data.get('note_content'),
                    content=note_data.get('content') or note_data.get('note_content'),
                    created_by=request.current_user.id,
                    created_at=datetime.datetime.utcnow()
                )
                db.session.add(note)
        
        db.session.commit()
        
        # Log encounter creation
        audit_log = AuditLog(
            log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
            user_id=request.current_user.id,
            action_type='clinical_encounter_created',
            resource_type='clinical_encounter',
            resource_id=encounter.id,
            patient_id=patient.id,
            facility_id=encounter.facility_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            success=True,
            details={'encounter_id': encounter.encounter_id, 'encounter_type': encounter.encounter_type}
        )
        db.session.add(audit_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'encounter': encounter.to_dict(),
            'message': 'Clinical encounter created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to create encounter: {str(e)}'}), 500

@provider_workflows_bp.route('/physician/prescribe', methods=['POST'])
@token_required
@role_required(['Physician', 'System Administrator'])
@tenant_isolation_required
def prescribe_medication():
    """Prescribe medication for patient"""
    try:
        data = request.get_json()
        
        # Get current provider
        provider = Provider.query.filter_by(user_account_id=request.current_user.id).first()
        if not provider:
            return jsonify({'error': 'Provider profile not found'}), 404
        
        # Validate required fields
        required_fields = ['patient_id', 'medication_name', 'dosage', 'frequency']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Find patient
        patient = Patient.query.filter(
            db.or_(
                Patient.id == data['patient_id'],
                Patient.universal_patient_id == data['patient_id']
            )
        ).first()
        
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        # Create medication prescription
        medication = Medication(
            patient_id=patient.id,
            medication_name=data['medication_name'],
            dosage=data['dosage'],
            frequency=data['frequency'],
            route=data.get('route', 'oral'),
            start_date=datetime.datetime.strptime(data.get('start_date', datetime.date.today().isoformat()), '%Y-%m-%d').date(),
            end_date=datetime.datetime.strptime(data['end_date'], '%Y-%m-%d').date() if data.get('end_date') else None,
            prescribing_provider=f"{provider.first_name} {provider.last_name}",
            prescribing_provider_id=provider.id,
            notes=data.get('notes'),
            prescribed_by=request.current_user.id,
            created_at=datetime.datetime.utcnow()
        )
        
        db.session.add(medication)
        db.session.commit()
        
        # Log prescription
        audit_log = AuditLog(
            log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
            user_id=request.current_user.id,
            action_type='medication_prescribed',
            resource_type='medication',
            resource_id=medication.id,
            patient_id=patient.id,
            facility_id=request.token_payload.get('facility_id'),
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            success=True,
            details={
                'medication_name': medication.medication_name,
                'dosage': medication.dosage,
                'prescribing_provider': medication.prescribing_provider
            }
        )
        db.session.add(audit_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'medication': medication.to_dict(),
            'message': 'Medication prescribed successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to prescribe medication: {str(e)}'}), 500

@provider_workflows_bp.route('/physician/lab-order', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'System Administrator'])
@tenant_isolation_required
def create_lab_order():
    """Create new lab order"""
    try:
        data = request.get_json()
        
        # Get current provider
        provider = Provider.query.filter_by(user_account_id=request.current_user.id).first()
        if not provider:
            return jsonify({'error': 'Provider profile not found'}), 404
        
        # Validate required fields
        required_fields = ['patient_id', 'test_name']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Find patient
        patient = Patient.query.filter(
            db.or_(
                Patient.id == data['patient_id'],
                Patient.universal_patient_id == data['patient_id']
            )
        ).first()
        
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        # Parse order date
        order_date_str = data.get('order_date', datetime.date.today().isoformat())
        if isinstance(order_date_str, str):
            order_date = datetime.datetime.strptime(order_date_str, '%Y-%m-%d').date()
        else:
            order_date = order_date_str
        
        # Create lab order
        lab_order = LabOrder(
            order_id=f"LAB-{uuid.uuid4().hex[:8].upper()}",
            patient_id=patient.id,
            ordering_provider_id=provider.id,
            facility_id=request.token_payload.get('facility_id'),
            encounter_id=data.get('encounter_id'),
            test_name=data['test_name'],
            test_code=data.get('test_code'),
            test_type=data.get('test_type', 'laboratory'),
            priority=data.get('priority', 'routine'),
            order_date=order_date,
            clinical_indication=data.get('clinical_indication'),
            special_instructions=data.get('special_instructions'),
            fasting_required=data.get('fasting_required', False),
            specimen_type=data.get('specimen_type', 'blood'),
            status=data.get('status', 'pending'),
            order_status=data.get('order_status', 'pending'),
            created_at=datetime.datetime.utcnow()
        )
        
        db.session.add(lab_order)
        db.session.flush()
        
        db.session.commit()
        
        # Log lab order creation
        audit_log = AuditLog(
            log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
            user_id=request.current_user.id,
            action_type='lab_order_created',
            resource_type='lab_order',
            resource_id=lab_order.id,
            patient_id=patient.id,
            facility_id=lab_order.facility_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            success=True,
            details={'order_id': lab_order.order_id, 'test_name': lab_order.test_name}
        )
        db.session.add(audit_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'lab_order': lab_order.to_dict(),
            'message': 'Lab order created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to create lab order: {str(e)}'}), 500

# Nurse Workflows

@provider_workflows_bp.route('/nurse/dashboard', methods=['GET'])
@token_required
@role_required(['Nurse', 'System Administrator'])
@tenant_isolation_required
def nurse_dashboard():
    """Get nurse dashboard with patient assignments and tasks"""
    try:
        # Get current provider
        provider = Provider.query.filter_by(user_account_id=request.current_user.id).first()
        if not provider:
            return jsonify({'error': 'Provider profile not found'}), 404
        
        facility_id = request.token_payload.get('facility_id')
        today = datetime.date.today()
        
        # Get today's patient assignments (encounters where nurse is involved)
        todays_encounters = ClinicalEncounter.query.filter(
            db.cast(ClinicalEncounter.encounter_date, db.Date) == today,
            ClinicalEncounter.facility_id == facility_id
        ).all()
        
        # Get patients needing vital signs
        patients_needing_vitals = []
        for encounter in todays_encounters:
            # Check if vitals were recorded today
            vitals_today = VitalSigns.query.filter(
                VitalSigns.patient_id == encounter.patient_id,
                VitalSigns.recorded_at >= datetime.datetime.combine(today, datetime.time.min)
            ).first()
            
            if not vitals_today:
                patients_needing_vitals.append({
                    'encounter': encounter.to_dict(),
                    'patient': encounter.patient.to_dict() if encounter.patient else None
                })
        
        # Get recent vital signs recorded by this nurse
        recent_vitals = VitalSigns.query.filter(
            VitalSigns.recorded_by == request.current_user.id,
            VitalSigns.recorded_at >= datetime.datetime.now() - datetime.timedelta(days=7)
        ).order_by(VitalSigns.recorded_at.desc()).limit(10).all()
        
        dashboard_data = {
            'provider': provider.to_dict(),
            'today_stats': {
                'total_encounters': len(todays_encounters),
                'patients_needing_vitals': len(patients_needing_vitals),
                'vitals_recorded_today': VitalSigns.query.filter(
                    VitalSigns.recorded_by == request.current_user.id,
                    VitalSigns.recorded_at >= datetime.datetime.combine(today, datetime.time.min)
                ).count()
            },
            'patients_needing_vitals': patients_needing_vitals,
            'recent_vitals': [vitals.to_dict() for vitals in recent_vitals],
            'todays_encounters': [encounter.to_dict() for encounter in todays_encounters]
        }
        
        return jsonify({
            'success': True,
            'dashboard': dashboard_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to load nurse dashboard: {str(e)}'}), 500

@provider_workflows_bp.route('/nurse/vitals', methods=['POST'])
@token_required
@role_required(['Nurse', 'Physician', 'System Administrator'])
@tenant_isolation_required
def record_vital_signs():
    """Record patient vital signs"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['patient_id']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Find patient
        patient = Patient.query.filter(
            db.or_(
                Patient.id == data['patient_id'],
                Patient.universal_patient_id == data['patient_id']
            )
        ).first()
        
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        # Create vital signs record
        vitals = VitalSigns(
            patient_id=patient.id,
            encounter_id=data.get('encounter_id'),
            systolic_bp=data.get('systolic_bp'),
            diastolic_bp=data.get('diastolic_bp'),
            heart_rate=data.get('heart_rate'),
            temperature=data.get('temperature'),
            respiratory_rate=data.get('respiratory_rate'),
            oxygen_saturation=data.get('oxygen_saturation'),
            weight=data.get('weight'),
            weight_pounds=data.get('weight'),
            height=data.get('height'),
            height_inches=data.get('height'),
            pain_scale=data.get('pain_scale'),
            notes=data.get('notes'),
            recorded_by=request.current_user.id,
            recorded_at=datetime.datetime.utcnow()
        )
        
        db.session.add(vitals)
        db.session.commit()
        
        # Log vital signs recording
        audit_log = AuditLog(
            log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
            user_id=request.current_user.id,
            action_type='vital_signs_recorded',
            resource_type='vital_signs',
            resource_id=vitals.id,
            patient_id=patient.id,
            facility_id=request.token_payload.get('facility_id'),
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            success=True
        )
        db.session.add(audit_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'vital_signs': vitals.to_dict(),
            'message': 'Vital signs recorded successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to record vital signs: {str(e)}'}), 500

# Pharmacist Workflows

@provider_workflows_bp.route('/pharmacist/dashboard', methods=['GET'])
@token_required
@role_required(['Pharmacist', 'System Administrator'])
@tenant_isolation_required
def pharmacist_dashboard():
    """Get pharmacist dashboard with prescription management"""
    try:
        facility_id = request.token_payload.get('facility_id')
        
        # Get pending prescriptions (new medications)
        pending_prescriptions = Medication.query.filter(
            Medication.is_active == True,
            Medication.created_at >= datetime.datetime.now() - datetime.timedelta(days=7)
        ).order_by(Medication.created_at.desc()).all()
        
        # Get medications needing review
        medications_for_review = Medication.query.filter(
            Medication.is_active == True,
            Medication.end_date.is_(None)  # Long-term medications
        ).all()
        
        # Get recent medication changes
        recent_changes = Medication.query.filter(
            Medication.updated_at >= datetime.datetime.now() - datetime.timedelta(days=7)
        ).order_by(Medication.updated_at.desc()).limit(20).all()
        
        dashboard_data = {
            'stats': {
                'pending_prescriptions': len(pending_prescriptions),
                'medications_for_review': len(medications_for_review),
                'recent_changes': len(recent_changes)
            },
            'pending_prescriptions': [
                {
                    'medication': med.to_dict(),
                    'patient': med.patient.to_dict() if med.patient else None
                }
                for med in pending_prescriptions[:10]
            ],
            'medications_for_review': [
                {
                    'medication': med.to_dict(),
                    'patient': med.patient.to_dict() if med.patient else None
                }
                for med in medications_for_review[:10]
            ],
            'recent_changes': [med.to_dict() for med in recent_changes]
        }
        
        return jsonify({
            'success': True,
            'dashboard': dashboard_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to load pharmacist dashboard: {str(e)}'}), 500

@provider_workflows_bp.route('/pharmacist/medication-review', methods=['POST'])
@token_required
@role_required(['Pharmacist', 'System Administrator'])
@tenant_isolation_required
def medication_review():
    """Review and update medication status"""
    try:
        data = request.get_json()
        
        # Find medication
        medication = Medication.query.get(data.get('medication_id'))
        if not medication:
            return jsonify({'error': 'Medication not found'}), 404
        
        # Update medication based on review
        review_action = data.get('action')  # 'approve', 'modify', 'discontinue'
        review_notes = data.get('notes', '')
        
        if review_action == 'approve':
            # Medication approved as-is - mark as reviewed
            medication.notes = f"{medication.notes or ''}\n[Pharmacist Review {datetime.date.today()}]: Approved".strip()
            medication.is_active = True
        elif review_action == 'modify':
            # Update medication details
            if data.get('new_dosage'):
                medication.dosage = data['new_dosage']
            if data.get('new_frequency'):
                medication.frequency = data['new_frequency']
            if data.get('new_end_date'):
                medication.end_date = datetime.datetime.strptime(data['new_end_date'], '%Y-%m-%d').date()
        elif review_action == 'discontinue':
            # Discontinue medication
            medication.is_active = False
            medication.end_date = datetime.date.today()
        
        # Add review notes
        if review_notes:
            current_notes = medication.notes or ''
            medication.notes = f"{current_notes}\n[Pharmacist Review {datetime.date.today()}]: {review_notes}".strip()
        
        medication.updated_at = datetime.datetime.utcnow()
        medication.updated_by = request.current_user.id
        
        db.session.commit()
        
        # Log medication review
        audit_log = AuditLog(
            log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
            user_id=request.current_user.id,
            action_type='medication_reviewed',
            resource_type='medication',
            resource_id=medication.id,
            patient_id=medication.patient_id,
            facility_id=request.token_payload.get('facility_id'),
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            success=True,
            details={
                'action': review_action,
                'medication_name': medication.medication_name
            }
        )
        db.session.add(audit_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'medication': medication.to_dict(),
            'message': f'Medication {review_action}d successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to review medication: {str(e)}'}), 500

# Lab Technician Workflows

@provider_workflows_bp.route('/lab/dashboard', methods=['GET'])
@token_required
@role_required(['Lab Technician', 'System Administrator'])
@tenant_isolation_required
def lab_dashboard():
    """Get lab technician dashboard with pending orders and results"""
    try:
        facility_id = request.token_payload.get('facility_id')
        
        # Get pending lab orders
        pending_orders = LabOrder.query.filter(
            LabOrder.status == 'pending',
            LabOrder.facility_id == facility_id
        ).order_by(LabOrder.order_date.desc()).all()
        
        # Get in-progress orders
        in_progress_orders = LabOrder.query.filter(
            LabOrder.status == 'in_progress',
            LabOrder.facility_id == facility_id
        ).order_by(LabOrder.order_date.desc()).all()
        
        # Get recent results
        recent_results = LabResult.query.filter(
            db.cast(LabResult.result_date, db.Date) >= datetime.date.today() - datetime.timedelta(days=7)
        ).order_by(LabResult.result_date.desc()).limit(20).all()
        
        dashboard_data = {
            'stats': {
                'pending_orders': len(pending_orders),
                'in_progress_orders': len(in_progress_orders),
                'results_today': LabResult.query.filter(
                    db.cast(LabResult.result_date, db.Date) == datetime.date.today()
                ).count()
            },
            'pending_orders': [
                {
                    'order': order.to_dict(),
                    'patient': order.patient.to_dict() if order.patient else None
                }
                for order in pending_orders
            ],
            'in_progress_orders': [
                {
                    'order': order.to_dict(),
                    'patient': order.patient.to_dict() if order.patient else None
                }
                for order in in_progress_orders
            ],
            'recent_results': [result.to_dict() for result in recent_results]
        }
        
        return jsonify({
            'success': True,
            'dashboard': dashboard_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to load lab dashboard: {str(e)}'}), 500

@provider_workflows_bp.route('/lab/result', methods=['POST'])
@token_required
@role_required(['Lab Technician', 'System Administrator'])
@tenant_isolation_required
def submit_lab_result():
    """Submit lab test result"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['order_id', 'test_name', 'result_value']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Find lab order - can be by order_id string or lab_order_id integer
        lab_order = None
        if isinstance(data['order_id'], int):
            lab_order = LabOrder.query.get(data['order_id'])
        else:
            lab_order = LabOrder.query.filter_by(order_id=data['order_id']).first()
        
        if not lab_order:
            return jsonify({'error': 'Lab order not found'}), 404
        
        # Create lab result
        lab_result = LabResult(
            result_id=f"LAB-{uuid.uuid4().hex[:8].upper()}",
            patient_id=lab_order.patient_id,
            lab_order_id=lab_order.id,
            order_id=lab_order.order_id,
            test_name=data['test_name'],
            result_value=data['result_value'],
            reference_range=data.get('reference_range'),
            units=data.get('units'),
            result_unit=data.get('units'),
            status=data.get('status', 'normal'),
            abnormal_flag=data.get('status', 'normal'),
            notes=data.get('notes'),
            result_date=datetime.datetime.now(),
            performed_by=request.current_user.id,
            created_at=datetime.datetime.utcnow()
        )
        
        db.session.add(lab_result)
        
        # Update lab order status
        lab_order.status = 'completed'
        lab_order.order_status = 'completed'
        lab_order.completed_date = datetime.date.today()
        
        db.session.commit()
        
        # Log lab result submission
        audit_log = AuditLog(
            log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
            user_id=request.current_user.id,
            action_type='lab_result_submitted',
            resource_type='lab_result',
            resource_id=lab_result.id,
            patient_id=lab_order.patient_id,
            facility_id=request.token_payload.get('facility_id'),
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            success=True,
            details={
                'test_name': lab_result.test_name,
                'result_id': lab_result.result_id
            }
        )
        db.session.add(audit_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'lab_result': lab_result.to_dict(),
            'message': 'Lab result submitted successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to submit lab result: {str(e)}'}), 500

# General Provider Utilities

@provider_workflows_bp.route('/provider/patients', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'Pharmacist', 'Lab Technician', 'System Administrator'])
@tenant_isolation_required
def get_provider_patients():
    """Get patients relevant to current provider"""
    try:
        # Get current provider
        provider = Provider.query.filter_by(user_account_id=request.current_user.id).first()
        facility_id = request.token_payload.get('facility_id')
        
        # Get patients based on provider type and recent interactions
        user_roles = [role['role_name'] for role in request.token_payload.get('roles', [])]
        
        if 'Physician' in user_roles and provider:
            # Get patients with recent encounters with this physician
            patients = db.session.query(Patient).join(ClinicalEncounter).filter(
                ClinicalEncounter.provider_id == provider.id,
                db.cast(ClinicalEncounter.encounter_date, db.Date) >= datetime.date.today() - datetime.timedelta(days=30)
            ).distinct().all()
        else:
            # Get all patients in facility for other roles
            patients = Patient.query.filter_by(facility_id=facility_id).limit(50).all()
        
        return jsonify({
            'success': True,
            'patients': [patient.to_dict() for patient in patients],
            'provider_type': user_roles[0] if user_roles else 'Unknown'
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to get provider patients: {str(e)}'}), 500

@provider_workflows_bp.route('/workflows', methods=['GET'])
@token_required
def get_workflows():
    """Get all available workflows"""
    try:
        workflows = [
            {
                'id': 1,
                'name': 'New Patient Intake',
                'description': 'Complete workflow for new patient registration and initial assessment',
                'category': 'Registration',
                'step_count': 8,
                'duration': '30-45 minutes'
            },
            {
                'id': 2,
                'name': 'Annual Physical Exam',
                'description': 'Comprehensive annual physical examination protocol',
                'category': 'Preventive',
                'step_count': 12,
                'duration': '45-60 minutes'
            },
            {
                'id': 3,
                'name': 'Diabetes Management',
                'description': 'Chronic disease management for diabetes patients',
                'category': 'Chronic Care',
                'step_count': 15,
                'duration': '30 minutes'
            },
            {
                'id': 4,
                'name': 'Hypertension Protocol',
                'description': 'Blood pressure management and monitoring',
                'category': 'Chronic Care',
                'step_count': 10,
                'duration': '20 minutes'
            },
            {
                'id': 5,
                'name': 'Pre-Op Assessment',
                'description': 'Pre-operative evaluation and clearance',
                'category': 'Surgical',
                'step_count': 14,
                'duration': '45 minutes'
            }
        ]
        
        return jsonify({
            'success': True,
            'workflows': workflows
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@provider_workflows_bp.route('/templates', methods=['GET'])
@token_required
def get_workflow_templates():
    """Get workflow templates"""
    try:
        templates = [
            {
                'id': 1,
                'name': 'New Patient Intake',
                'description': 'Complete workflow for new patient registration',
                'category': 'Registration',
                'step_count': 8,
                'duration': '30-45 min'
            },
            {
                'id': 2,
                'name': 'Annual Physical',
                'description': 'Annual physical examination protocol',
                'category': 'Preventive',
                'step_count': 12,
                'duration': '45-60 min'
            },
            {
                'id': 3,
                'name': 'Diabetes Management',
                'description': 'Chronic disease management protocol',
                'category': 'Chronic Care',
                'step_count': 15,
                'duration': '30 min'
            }
        ]
        
        return jsonify({
            'success': True,
            'templates': templates
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@provider_workflows_bp.route('/active', methods=['GET'])
@token_required
def get_active_workflows():
    """Get active workflow instances"""
    try:
        active_workflows = [
            {
                'id': 1,
                'workflow_name': 'New Patient Intake',
                'patient_name': 'John Doe',
                'started_at': datetime.datetime.now().isoformat(),
                'status': 'active',
                'completed_steps': 3,
                'total_steps': 8,
                'steps': [
                    {'id': 1, 'name': 'Patient Registration', 'description': 'Register patient demographics', 'completed': True, 'current': False},
                    {'id': 2, 'name': 'Insurance Verification', 'description': 'Verify insurance coverage', 'completed': True, 'current': False},
                    {'id': 3, 'name': 'Medical History', 'description': 'Collect medical history', 'completed': True, 'current': False},
                    {'id': 4, 'name': 'Vital Signs', 'description': 'Record vital signs', 'completed': False, 'current': True},
                    {'id': 5, 'name': 'Physical Exam', 'description': 'Perform physical examination', 'completed': False, 'current': False},
                    {'id': 6, 'name': 'Lab Orders', 'description': 'Order necessary labs', 'completed': False, 'current': False},
                    {'id': 7, 'name': 'Treatment Plan', 'description': 'Create treatment plan', 'completed': False, 'current': False},
                    {'id': 8, 'name': 'Follow-up Schedule', 'description': 'Schedule follow-up', 'completed': False, 'current': False}
                ]
            }
        ]
        
        return jsonify({
            'success': True,
            'active': active_workflows
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@provider_workflows_bp.route('/start', methods=['POST'])
@token_required
def start_workflow():
    """Start a new workflow instance"""
    try:
        data = request.get_json()
        workflow_id = data.get('workflow_id')
        patient_id = data.get('patient_id')
        
        # In production, create workflow instance in database
        # For now, return mock success
        
        return jsonify({
            'success': True,
            'message': 'Workflow started successfully',
            'workflow_instance_id': 1,
            'token_number': f'WF-{workflow_id}-{patient_id}'
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@provider_workflows_bp.route('/<int:workflow_id>/step/<int:step_id>/complete', methods=['POST'])
@token_required
def complete_workflow_step(workflow_id, step_id):
    """Mark a workflow step as complete"""
    try:
        # In production, update workflow instance in database
        
        return jsonify({
            'success': True,
            'message': 'Step completed successfully'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@provider_workflows_bp.route('/create', methods=['POST'])
@token_required
@role_required(['admin', 'system_administrator'])
def create_workflow():
    """Create a new workflow template"""
    try:
        data = request.get_json()
        
        workflow_name = data.get('name')
        description = data.get('description')
        category = data.get('category', 'General')
        duration = data.get('duration')
        steps = data.get('steps', [])
        
        if not workflow_name or not steps:
            return jsonify({'error': 'Workflow name and steps are required'}), 400
        
        # In production, save to database
        # For now, return success with generated ID
        workflow_id = len(steps) + 100  # Mock ID
        
        return jsonify({
            'success': True,
            'message': 'Workflow created successfully',
            'workflow_id': workflow_id,
            'workflow': {
                'id': workflow_id,
                'name': workflow_name,
                'description': description,
                'category': category,
                'duration': duration,
                'step_count': len(steps),
                'steps': steps
            }
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@provider_workflows_bp.route('/<int:workflow_id>', methods=['DELETE'])
@token_required
@role_required(['admin', 'system_administrator'])
def delete_workflow(workflow_id):
    """Delete a workflow template"""
    try:
        # In production, delete from database
        # Check if workflow is in use before deleting
        
        return jsonify({
            'success': True,
            'message': 'Workflow deleted successfully'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@provider_workflows_bp.route('/<int:workflow_id>', methods=['PUT'])
@token_required
@role_required(['admin', 'system_administrator'])
def update_workflow(workflow_id):
    """Update a workflow template"""
    try:
        data = request.get_json()
        
        # In production, update in database
        
        return jsonify({
            'success': True,
            'message': 'Workflow updated successfully'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

