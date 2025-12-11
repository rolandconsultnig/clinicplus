"""
Clinical Decision Support (CDS) API Routes
"""
from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.cds import CDSRule, CDSAlert, CareGap
from src.models.patient import Patient, MedicalHistory, Allergy, Medication
from src.models.clinical import ClinicalEncounter, LabResult, VitalSigns
from src.models.prescribing import Prescription
from datetime import datetime, date, timedelta
import uuid
import json
from dateutil.relativedelta import relativedelta

cds_bp = Blueprint('cds', __name__)

@cds_bp.route('/rules', methods=['GET'])
@token_required
def get_cds_rules():
    """Get CDS rules"""
    try:
        rule_type = request.args.get('rule_type')
        rule_category = request.args.get('rule_category')
        is_active = request.args.get('is_active', type=bool, default=True)
        
        query = CDSRule.query
        
        if rule_type:
            query = query.filter(CDSRule.rule_type == rule_type)
        if rule_category:
            query = query.filter(CDSRule.rule_category == rule_category)
        if is_active is not None:
            query = query.filter(CDSRule.is_active == is_active)
        
        rules = query.order_by(CDSRule.priority.desc()).all()
        
        return jsonify({
            'success': True,
            'rules': [r.to_dict() for r in rules]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@cds_bp.route('/alerts', methods=['GET'])
@token_required
def get_cds_alerts():
    """Get CDS alerts"""
    try:
        patient_id = request.args.get('patient_id', type=int)
        encounter_id = request.args.get('encounter_id', type=int)
        alert_type = request.args.get('alert_type')
        status = request.args.get('status', 'active')
        severity = request.args.get('severity')
        
        query = CDSAlert.query
        
        if patient_id:
            query = query.filter(CDSAlert.patient_id == patient_id)
        if encounter_id:
            query = query.filter(CDSAlert.encounter_id == encounter_id)
        if alert_type:
            query = query.filter(CDSAlert.alert_type == alert_type)
        if status:
            query = query.filter(CDSAlert.status == status)
        if severity:
            query = query.filter(CDSAlert.alert_severity == severity)
        
        alerts = query.order_by(
            CDSAlert.alert_severity.desc(),
            CDSAlert.created_at.desc()
        ).limit(100).all()
        
        return jsonify({
            'success': True,
            'alerts': [a.to_dict() for a in alerts]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@cds_bp.route('/alerts/<int:alert_id>/acknowledge', methods=['POST'])
@token_required
@role_required(['physician', 'nurse'])
def acknowledge_alert(alert_id):
    """Acknowledge a CDS alert"""
    try:
        alert = CDSAlert.query.get_or_404(alert_id)
        alert.status = 'acknowledged'
        alert.acknowledged_at = datetime.utcnow()
        alert.acknowledged_by = request.current_user.id
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'alert': alert.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@cds_bp.route('/care-gaps', methods=['GET'])
@token_required
def get_care_gaps():
    """Get care gaps for patient"""
    try:
        patient_id = request.args.get('patient_id', type=int)
        gap_type = request.args.get('gap_type')
        status = request.args.get('status', 'open')
        
        query = CareGap.query
        
        if patient_id:
            query = query.filter(CareGap.patient_id == patient_id)
        if gap_type:
            query = query.filter(CareGap.gap_type == gap_type)
        if status:
            query = query.filter(CareGap.status == status)
        
        gaps = query.order_by(CareGap.due_date).all()
        
        return jsonify({
            'success': True,
            'care_gaps': [g.to_dict() for g in gaps]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@cds_bp.route('/check-patient/<int:patient_id>', methods=['POST'])
@token_required
@role_required(['physician', 'nurse'])
def check_patient_cds(patient_id):
    """Run CDS checks for a patient"""
    try:
        encounter_id = request.json.get('encounter_id')
        
        # Get active CDS rules
        rules = CDSRule.query.filter(CDSRule.is_active == True).all()
        
        alerts_created = []
        
        for rule in rules:
            # Check if rule applies to this patient
            applicable = check_rule_applicability(rule, patient_id)
            
            if applicable:
                # Evaluate rule conditions
                triggered = evaluate_rule(rule, patient_id, encounter_id)
                
                if triggered:
                    # Create alert
                    alert = CDSAlert(
                        alert_id=f"CDS-{uuid.uuid4().hex[:12].upper()}",
                        patient_id=patient_id,
                        encounter_id=encounter_id,
                        facility_id=request.json.get('facility_id'),
                        rule_id=rule.id,
                        alert_type=rule.rule_type,
                        alert_message=generate_alert_message(rule, patient_id),
                        alert_severity=determine_severity(rule),
                        alert_data=json.dumps(triggered),
                        status='active'
                    )
                    
                    db.session.add(alert)
                    alerts_created.append(alert.alert_id)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'alerts_created': len(alerts_created),
            'alert_ids': alerts_created
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

def check_rule_applicability(rule, patient_id):
    """Check if rule applies to patient based on patient characteristics"""
    try:
        patient = Patient.query.get(patient_id)
        if not patient:
            return False
        
        # Parse applicability criteria
        applicable_types = {}
        if rule.applicable_patient_types:
            try:
                applicable_types = json.loads(rule.applicable_patient_types)
            except (json.JSONDecodeError, TypeError, AttributeError):
                applicable_types = {}
        
        # Check age range
        if 'age_min' in applicable_types or 'age_max' in applicable_types:
            age_min = applicable_types.get('age_min')
            age_max = applicable_types.get('age_max')
            if patient.date_of_birth:
                age = relativedelta(date.today(), patient.date_of_birth).years
                if age_min and age < age_min:
                    return False
                if age_max and age > age_max:
                    return False
        
        # Check gender
        if 'genders' in applicable_types:
            genders = applicable_types.get('genders', [])
            if genders and patient.gender not in genders:
                return False
        
        # Check conditions
        if 'conditions' in applicable_types:
            required_conditions = applicable_types.get('conditions', [])
            if required_conditions:
                patient_conditions = [mh.condition_name.lower() for mh in MedicalHistory.query.filter_by(patient_id=patient_id).all()]
                has_condition = any(cond.lower() in ' '.join(patient_conditions) for cond in required_conditions)
                if not has_condition:
                    return False
        
        return True
    except Exception as e:
        print(f"Error checking rule applicability: {e}")
        return False

def evaluate_rule(rule, patient_id, encounter_id):
    """Evaluate rule conditions against patient data"""
    try:
        conditions = {}
        if rule.rule_conditions:
            try:
                conditions = json.loads(rule.rule_conditions)
            except (json.JSONDecodeError, TypeError, AttributeError):
                conditions = {}
        
        triggered_data = {}
        patient = Patient.query.get(patient_id)
        
        # Age-based checks
        if 'age_check' in conditions:
            age_check = conditions['age_check']
            if patient.date_of_birth:
                age = relativedelta(date.today(), patient.date_of_birth).years
                if 'min_age' in age_check and age < age_check['min_age']:
                    triggered_data['age'] = f"Patient age {age} below minimum {age_check['min_age']}"
                if 'max_age' in age_check and age > age_check['max_age']:
                    triggered_data['age'] = f"Patient age {age} above maximum {age_check['max_age']}"
        
        # Medication checks
        if 'medication_check' in conditions:
            med_check = conditions['medication_check']
            active_meds = Medication.query.filter_by(patient_id=patient_id, is_active=True).all()
            med_names = [m.medication_name.lower() for m in active_meds]
            
            if 'required_medications' in med_check:
                required = med_check['required_medications']
                missing = [m for m in required if m.lower() not in med_names]
                if missing:
                    triggered_data['medications'] = f"Missing required medications: {', '.join(missing)}"
            
            if 'contraindicated_medications' in med_check:
                contraindicated = med_check['contraindicated_medications']
                found = [m for m in contraindicated if m.lower() in med_names]
                if found:
                    triggered_data['medications'] = f"Contraindicated medications found: {', '.join(found)}"
        
        # Lab result checks
        if 'lab_check' in conditions:
            lab_check = conditions['lab_check']
            if 'test_name' in lab_check and 'threshold' in lab_check:
                test_name = lab_check['test_name']
                threshold = lab_check['threshold']
                operator = lab_check.get('operator', '>')
                
                recent_lab = LabResult.query.filter_by(patient_id=patient_id).order_by(LabResult.result_date.desc()).first()
                if recent_lab and test_name.lower() in recent_lab.test_name.lower():
                    try:
                        value = float(recent_lab.result_value)
                        if operator == '>' and value > threshold:
                            triggered_data['lab'] = f"{test_name} value {value} exceeds threshold {threshold}"
                        elif operator == '<' and value < threshold:
                            triggered_data['lab'] = f"{test_name} value {value} below threshold {threshold}"
                        elif operator == '==' and value == threshold:
                            triggered_data['lab'] = f"{test_name} value {value} equals threshold {threshold}"
                        elif operator == '>=' and value >= threshold:
                            triggered_data['lab'] = f"{test_name} value {value} meets or exceeds threshold {threshold}"
                        elif operator == '<=' and value <= threshold:
                            triggered_data['lab'] = f"{test_name} value {value} meets or below threshold {threshold}"
                    except (ValueError, TypeError, AttributeError):
                        # Skip if value cannot be converted to float
                        pass
        
        # Vital signs checks
        if 'vitals_check' in conditions:
            vitals_check = conditions['vitals_check']
            if encounter_id:
                vitals = VitalSigns.query.filter_by(encounter_id=encounter_id).first()
                if vitals:
                    if 'blood_pressure_systolic' in vitals_check:
                        threshold = vitals_check['blood_pressure_systolic']
                        if vitals.blood_pressure_systolic and vitals.blood_pressure_systolic > threshold:
                            triggered_data['vitals'] = f"High systolic BP: {vitals.blood_pressure_systolic}"
        
        # Care gap checks
        if rule.rule_type == 'care_gap':
            gap_type = conditions.get('gap_type')
            if gap_type == 'preventive_screening':
                # Check for overdue screenings
                last_screening = conditions.get('last_screening_days', 365)
                # This would check against actual screening records
                triggered_data['care_gap'] = f"Preventive screening overdue (last {last_screening} days)"
        
        # Time-based checks
        if 'time_based' in conditions:
            time_check = conditions['time_based']
            if 'last_encounter_days' in time_check:
                days = time_check['last_encounter_days']
                last_encounter = ClinicalEncounter.query.filter_by(patient_id=patient_id).order_by(ClinicalEncounter.encounter_date.desc()).first()
                if last_encounter:
                    days_since = (date.today() - last_encounter.encounter_date.date()).days
                    if days_since > days:
                        triggered_data['time'] = f"Last encounter was {days_since} days ago (threshold: {days})"
        
        return triggered_data if triggered_data else None
    except Exception as e:
        import traceback
        print(f"Error evaluating rule: {e}")
        traceback.print_exc()
        return {'error': f'Rule evaluation failed: {str(e)}'}

def generate_alert_message(rule, patient_id):
    """Generate alert message based on rule and patient context"""
    try:
        patient = Patient.query.get(patient_id)
        patient_name = f"{patient.first_name} {patient.last_name}" if patient else "Patient"
        
        # Customize message based on rule type
        if rule.rule_type == 'care_gap':
            return f"Care Gap Alert: {rule.rule_description} for {patient_name}"
        elif rule.rule_type == 'drug_interaction':
            return f"Drug Interaction Warning: {rule.rule_description} for {patient_name}"
        elif rule.rule_type == 'clinical_alert':
            return f"Clinical Alert: {rule.rule_description} for {patient_name}"
        else:
            return f"{rule.rule_name}: {rule.rule_description} for {patient_name}"
    except:
        return f"{rule.rule_name}: {rule.rule_description}"

def determine_severity(rule):
    """Determine alert severity based on rule priority and type"""
    # Base severity on priority
    if rule.priority >= 8:
        base_severity = 'critical'
    elif rule.priority >= 5:
        base_severity = 'high'
    elif rule.priority >= 3:
        base_severity = 'medium'
    else:
        base_severity = 'low'
    
    # Adjust based on rule type
    if rule.rule_type == 'drug_interaction':
        # Drug interactions are typically high/critical
        if base_severity == 'low':
            return 'medium'
        return base_severity
    elif rule.rule_type == 'care_gap':
        # Care gaps are typically medium/low
        if base_severity == 'critical':
            return 'high'
        return base_severity
    
    return base_severity

