"""
Doctor Consultation Routes
Handles all doctor-specific clinical operations including SOAP notes,
orders (CPOE), results review, and visit finalization
"""
from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required, otp_verification_required
from src.models.user import db
from src.models.patient import Patient, MedicalHistory, Allergy, Medication
from src.models.clinical import ClinicalEncounter, VitalSigns, ClinicalNote, LabOrder, LabResult, SOAPTemplate
from src.models.provider import Provider
from src.models.prescribing import Prescription, DrugInteraction, Drug
from datetime import datetime, date, timedelta
import uuid
import json

doctor_bp = Blueprint('doctor', __name__)
_tables_ready = False


def _ensure_doctor_tables():
    global _tables_ready
    if _tables_ready:
        return
    SOAPTemplate.__table__.create(bind=db.engine, checkfirst=True)
    if SOAPTemplate.query.count() == 0:
        db.session.add_all([
            SOAPTemplate(
                name='Annual Physical Exam',
                specialty='General Practice',
                subjective='Patient presents for annual physical examination. No acute complaints.',
                objective='Vital signs stable. General appearance normal.',
                assessment='Routine health maintenance visit.',
                plan='Continue current medications; routine labs ordered; return in 1 year.'
            ),
            SOAPTemplate(
                name='Hypertension Follow-up',
                specialty='Cardiology',
                subjective='Patient returns for hypertension follow-up.',
                objective='Blood pressure reviewed.',
                assessment='Hypertension follow-up.',
                plan='Continue or adjust antihypertensives and reinforce lifestyle changes.'
            ),
        ])
        db.session.commit()
    _tables_ready = True


@doctor_bp.before_request
def initialize_doctor_module():
    _ensure_doctor_tables()

# Get Patient Data
@doctor_bp.route('/patient/<int:patient_id>', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
@otp_verification_required
def get_patient(patient_id):
    """Get comprehensive patient data"""
    try:
        patient = Patient.query.get_or_404(patient_id)
        
        return jsonify({
            'success': True,
            'patient': patient.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get Patient Overview
@doctor_bp.route('/patient/<int:patient_id>/overview', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
@otp_verification_required
def get_patient_overview(patient_id):
    """Get patient overview including vitals, allergies, medications, conditions"""
    try:
        # Get latest vitals
        vitals = VitalSigns.query.filter_by(
            patient_id=patient_id
        ).order_by(VitalSigns.recorded_at.desc()).first()
        
        # Get active allergies
        allergies = Allergy.query.filter_by(
            patient_id=patient_id,
            is_active=True
        ).all()
        
        # Get active medications
        medications = Medication.query.filter_by(
            patient_id=patient_id,
            is_active=True,
            status='active'
        ).all()
        
        # Get medical conditions
        conditions = MedicalHistory.query.filter_by(
            patient_id=patient_id,
            is_active=True
        ).all()
        
        return jsonify({
            'success': True,
            'vitals': vitals.to_dict() if vitals else None,
            'allergies': [a.to_dict() for a in allergies],
            'medications': [m.to_dict() for m in medications],
            'conditions': [c.to_dict() for c in conditions]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get Previous Visits
@doctor_bp.route('/patient/<int:patient_id>/visits', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
@otp_verification_required
def get_patient_visits(patient_id):
    """Get patient's previous consultation history"""
    try:
        encounters = ClinicalEncounter.query.filter_by(
            patient_id=patient_id
        ).order_by(ClinicalEncounter.encounter_date.desc()).limit(10).all()
        
        visits = []
        for encounter in encounters:
            visits.append({
                'id': encounter.id,
                'encounter_id': encounter.encounter_id,
                'encounter_date': encounter.encounter_date.isoformat() if encounter.encounter_date else None,
                'encounter_type': encounter.encounter_type,
                'chief_complaint': encounter.chief_complaint,
                'diagnosis': encounter.assessment or encounter.diagnosis,
                'provider_id': encounter.provider_id
            })
        
        return jsonify({
            'success': True,
            'visits': visits
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get Encounter Data
@doctor_bp.route('/encounter/<int:encounter_id>', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_encounter(encounter_id):
    """Get specific encounter details"""
    try:
        encounter = ClinicalEncounter.query.get_or_404(encounter_id)
        
        return jsonify({
            'success': True,
            'encounter': encounter.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Save SOAP Note
@doctor_bp.route('/encounter/<int:encounter_id>/soap', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def save_soap_note(encounter_id):
    """Save SOAP note for encounter"""
    try:
        encounter = ClinicalEncounter.query.get_or_404(encounter_id)
        data = request.get_json()
        
        # Update encounter with SOAP data
        encounter.history_present_illness = data.get('subjective', '')
        encounter.assessment = data.get('assessment', '')
        encounter.plan = data.get('plan', '')
        
        # Save diagnoses
        if data.get('diagnoses'):
            # Store as JSON or create separate diagnosis records
            import json
            encounter.diagnosis_codes = json.dumps(data.get('diagnoses'))
        
        encounter.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'SOAP note saved successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Search ICD-10 Codes
@doctor_bp.route('/icd10/search', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def search_icd10():
    """Search ICD-10 diagnosis codes"""
    try:
        query = request.args.get('q', '')

        # Build dynamic ICD-like suggestions from recorded diagnosis fields
        codes = {}
        encounters = ClinicalEncounter.query.order_by(ClinicalEncounter.updated_at.desc()).limit(500).all()
        for enc in encounters:
            if enc.diagnosis_codes:
                try:
                    parsed = json.loads(enc.diagnosis_codes)
                    if isinstance(parsed, list):
                        for item in parsed:
                            code = (item.get('code') if isinstance(item, dict) else None) or ''
                            description = (item.get('description') if isinstance(item, dict) else None) or ''
                            if code:
                                codes[code] = description or code
                except Exception:
                    pass
        # Also include simple diagnosis text from medical history as fallback
        for mh in MedicalHistory.query.order_by(MedicalHistory.created_at.desc()).limit(300).all():
            if mh.diagnosis and mh.diagnosis not in codes:
                codes[mh.diagnosis] = mh.diagnosis

        code_list = [{'code': code, 'description': desc} for code, desc in codes.items()]
        if query:
            q = query.lower()
            code_list = [c for c in code_list if q in c['code'].lower() or q in (c['description'] or '').lower()]
        
        return jsonify({
            'success': True,
            'codes': code_list[:20]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Search Drugs
@doctor_bp.route('/drugs/search', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def search_drugs():
    """Search drug formulary"""
    try:
        query = request.args.get('q', '')
        q = Drug.query.filter(Drug.is_active == True)
        if query:
            search_term = f"%{query}%"
            q = q.filter(
                db.or_(
                    Drug.drug_name.ilike(search_term),
                    Drug.generic_name.ilike(search_term)
                )
            )
        filtered_drugs = [{
            'id': d.id,
            'name': d.drug_name,
            'generic_name': d.generic_name,
            'strength': d.strength
        } for d in q.order_by(Drug.drug_name.asc()).limit(20).all()]
        
        return jsonify({
            'success': True,
            'drugs': filtered_drugs
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Create Prescriptions
@doctor_bp.route('/prescriptions', methods=['POST'])
@token_required
@role_required(['Physician', 'System Administrator'])
def create_prescriptions():
    """Create and send prescriptions to pharmacy"""
    try:
        data = request.get_json()
        patient_id = data.get('patient_id')
        encounter_id = data.get('encounter_id')
        prescriptions_data = data.get('prescriptions', [])
        encounter = ClinicalEncounter.query.get_or_404(encounter_id)
        provider = Provider.query.filter_by(user_account_id=request.current_user.id).first()
        provider_id = provider.id if provider else None
        
        created_prescriptions = []
        
        from src.services.prescribing_safety import (
            collect_prescription_warnings,
            blocking_warnings,
            warnings_json,
        )

        for rx_data in prescriptions_data:
            drug_name = (rx_data.get('medication') or '').strip()
            drug = Drug.query.filter(
                db.or_(Drug.drug_name.ilike(drug_name), Drug.generic_name.ilike(drug_name))
            ).first()
            if not drug:
                continue
            rx_warnings = collect_prescription_warnings(patient_id, drug.id)
            rx_blockers = blocking_warnings(rx_warnings)
            if rx_blockers:
                db.session.rollback()
                return jsonify({
                    'success': False,
                    'error': 'Prescription blocked due to drug interaction or allergy',
                    'drug': drug.drug_name,
                    'warnings': rx_warnings,
                    'blocking': rx_blockers,
                }), 400
            prescription = Prescription(
                prescription_id=f"RX-{uuid.uuid4().hex[:12].upper()}",
                patient_id=patient_id,
                encounter_id=encounter_id,
                provider_id=provider_id or encounter.provider_id,
                facility_id=encounter.facility_id,
                drug_id=drug.id,
                drug_name=drug.drug_name,
                rxnorm_code=drug.rxnorm_code,
                dosage=rx_data.get('dosage'),
                frequency=rx_data.get('frequency'),
                route=rx_data.get('route', 'oral'),
                quantity=int(rx_data.get('quantity') or 0),
                days_supply=int(rx_data.get('duration') or 0) if str(rx_data.get('duration', '')).isdigit() else None,
                refills=int(rx_data.get('refills') or 0),
                refills_remaining=int(rx_data.get('refills') or 0),
                sig=rx_data.get('instructions'),
                status='active',
                prescribed_date=date.today(),
                drug_interaction_checked=True,
                allergy_checked=True,
                interaction_warnings=warnings_json(rx_warnings),
                created_by=request.current_user.id
            )
            
            db.session.add(prescription)
            created_prescriptions.append(prescription)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'{len(created_prescriptions)} prescriptions sent to pharmacy',
            'prescriptions': [p.to_dict() for p in created_prescriptions]
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Create Lab Orders
@doctor_bp.route('/lab-orders', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def create_lab_orders():
    """Create laboratory test orders"""
    try:
        data = request.get_json()
        patient_id = data.get('patient_id')
        encounter_id = data.get('encounter_id')
        tests = data.get('tests', [])
        clinical_notes = data.get('clinical_notes', '')
        encounter = ClinicalEncounter.query.get_or_404(encounter_id)
        
        created_orders = []
        
        for test in tests:
            lab_order = LabOrder(
                order_id=f"LAB-{uuid.uuid4().hex[:8].upper()}",
                patient_id=patient_id,
                encounter_id=encounter_id,
                ordering_provider_id=encounter.provider_id,
                facility_id=encounter.facility_id,
                test_name=test,
                test_category='laboratory',
                status='pending',
                order_date=datetime.utcnow(),
                clinical_indication=clinical_notes
            )
            
            db.session.add(lab_order)
            created_orders.append(lab_order)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'{len(created_orders)} lab orders created',
            'orders': [o.to_dict() for o in created_orders]
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Get Patient Results
@doctor_bp.route('/patient/<int:patient_id>/results', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
@otp_verification_required
def get_patient_results(patient_id):
    """Get patient's lab and imaging results"""
    try:
        # Get recent lab results (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        lab_results = LabResult.query.filter(
            LabResult.patient_id == patient_id,
            LabResult.result_date >= thirty_days_ago
        ).order_by(LabResult.result_date.desc()).all()
        
        # Mock imaging results - integrate with PACS in production
        imaging_results = []
        
        return jsonify({
            'success': True,
            'lab_results': [r.to_dict() for r in lab_results],
            'imaging_results': imaging_results
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Finalize Encounter
@doctor_bp.route('/encounter/<int:encounter_id>/finalize', methods=['POST'])
@token_required
@role_required(['Physician', 'System Administrator'])
def finalize_encounter(encounter_id):
    """Finalize and sign-off encounter"""
    try:
        encounter = ClinicalEncounter.query.get_or_404(encounter_id)
        data = request.get_json()
        
        # Update encounter status
        encounter.encounter_status = 'completed'
        encounter.updated_at = datetime.utcnow()
        
        # Set follow-up if provided
        if data.get('follow_up_date'):
            encounter.follow_up_required = True
            encounter.follow_up_date = datetime.strptime(data.get('follow_up_date'), '%Y-%m-%d').date()
        
        # Save patient instructions
        if data.get('patient_instructions'):
            # Store instructions (could be in separate table or as note)
            note = ClinicalNote(
                patient_id=encounter.patient_id,
                encounter_id=encounter.id,
                note_type='patient_instructions',
                note_content=data.get('patient_instructions'),
                created_by=request.current_user.id,
                created_at=datetime.utcnow()
            )
            db.session.add(note)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Encounter finalized successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Get Clinical Decision Support
@doctor_bp.route('/cds/alerts/<int:patient_id>', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_cds_alerts(patient_id):
    """Get clinical decision support alerts"""
    try:
        alerts = []
        
        # Check for overdue screenings
        patient = Patient.query.get(patient_id)
        if patient:
            age = calculate_age(patient.date_of_birth)
            
            # Example: Flu shot reminder
            if age >= 65:
                alerts.append({
                    'type': 'screening',
                    'severity': 'info',
                    'message': 'Patient due for annual flu vaccination'
                })
            
            # Check for drug interactions
            active_meds = Medication.query.filter_by(
                patient_id=patient_id,
                is_active=True
            ).all()
            
            if len(active_meds) > 5:
                alerts.append({
                    'type': 'polypharmacy',
                    'severity': 'warning',
                    'message': 'Patient on multiple medications - review for interactions'
                })
        
        return jsonify({
            'success': True,
            'alerts': alerts
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Helper function
def calculate_age(dob):
    if not dob:
        return 0
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

# ============================================================================
# NEW ENDPOINTS FOR PHASE 2 IMPROVEMENTS
# ============================================================================

# Get Patient Allergies
@doctor_bp.route('/patient/<int:patient_id>/allergies', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_patient_allergies(patient_id):
    """Get patient's allergy list"""
    try:
        allergies = Allergy.query.filter_by(
            patient_id=patient_id,
            is_active=True
        ).all()
        
        return jsonify({
            'success': True,
            'allergies': [a.to_dict() for a in allergies]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get Patient Active Problems
@doctor_bp.route('/patient/<int:patient_id>/problems', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_patient_problems(patient_id):
    """Get patient's active medical problems"""
    try:
        status_filter = request.args.get('status', 'active')
        
        query = MedicalHistory.query.filter_by(patient_id=patient_id)
        
        if status_filter == 'active':
            query = query.filter_by(is_active=True)
        
        problems = query.order_by(MedicalHistory.onset_date.desc()).all()
        
        return jsonify({
            'success': True,
            'problems': [p.to_dict() for p in problems]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get Clinical Alerts
@doctor_bp.route('/patient/<int:patient_id>/clinical-alerts', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_clinical_alerts(patient_id):
    """Get clinical alerts for patient"""
    try:
        patient = Patient.query.get_or_404(patient_id)
        alerts = []
        
        # Check for critical allergies
        critical_allergies = Allergy.query.filter_by(
            patient_id=patient_id,
            is_active=True
        ).filter(Allergy.severity.in_(['severe', 'life-threatening'])).all()
        
        for allergy in critical_allergies:
            alerts.append({
                'type': 'allergy',
                'severity': 'critical',
                'message': f'CRITICAL ALLERGY: {allergy.allergen} - {allergy.reaction}',
                'allergen': allergy.allergen
            })
        
        # Check for abnormal vitals
        latest_vitals = VitalSigns.query.filter_by(
            patient_id=patient_id
        ).order_by(VitalSigns.recorded_at.desc()).first()
        
        if latest_vitals:
            # Check blood pressure
            if latest_vitals.systolic_bp and latest_vitals.systolic_bp > 140:
                alerts.append({
                    'type': 'vital_sign',
                    'severity': 'warning',
                    'message': f'Elevated BP: {latest_vitals.systolic_bp}/{latest_vitals.diastolic_bp} mmHg'
                })
            
            # Check temperature
            if latest_vitals.temperature and latest_vitals.temperature > 38.0:
                alerts.append({
                    'type': 'vital_sign',
                    'severity': 'warning',
                    'message': f'Fever: {latest_vitals.temperature}°C'
                })
        
        # Check for overdue screenings
        age = calculate_age(patient.date_of_birth)
        if age >= 50:
            alerts.append({
                'type': 'screening',
                'severity': 'info',
                'message': 'Patient due for age-appropriate cancer screenings'
            })
        
        # Check for polypharmacy
        active_meds = Medication.query.filter_by(
            patient_id=patient_id,
            is_active=True
        ).count()
        
        if active_meds > 5:
            alerts.append({
                'type': 'polypharmacy',
                'severity': 'warning',
                'message': f'Patient on {active_meds} medications - review for interactions'
            })
        
        return jsonify({
            'success': True,
            'alerts': alerts
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get Vitals Trend
@doctor_bp.route('/patient/<int:patient_id>/vitals-trend', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_vitals_trend(patient_id):
    """Get patient vitals trend over time"""
    try:
        days = request.args.get('days', 30, type=int)
        start_date = datetime.utcnow() - timedelta(days=days)
        
        vitals = VitalSigns.query.filter(
            VitalSigns.patient_id == patient_id,
            VitalSigns.recorded_at >= start_date
        ).order_by(VitalSigns.recorded_at.asc()).all()
        
        # Format trend data
        trend = {
            'blood_pressure': [],
            'heart_rate': [],
            'temperature': [],
            'weight': [],
            'dates': []
        }
        
        for vital in vitals:
            date_str = vital.recorded_at.strftime('%Y-%m-%d') if vital.recorded_at else ''
            trend['dates'].append(date_str)
            
            if vital.systolic_bp and vital.diastolic_bp:
                trend['blood_pressure'].append({
                    'systolic': vital.systolic_bp,
                    'diastolic': vital.diastolic_bp,
                    'date': date_str
                })
            
            if vital.heart_rate:
                trend['heart_rate'].append({
                    'value': vital.heart_rate,
                    'date': date_str
                })
            
            if vital.temperature:
                trend['temperature'].append({
                    'value': vital.temperature,
                    'date': date_str
                })
            
            if vital.weight:
                trend['weight'].append({
                    'value': vital.weight,
                    'date': date_str
                })
        
        return jsonify({
            'success': True,
            'trend': trend,
            'period_days': days
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Auto-save SOAP Note (PUT method for updates)
@doctor_bp.route('/encounter/<int:encounter_id>/soap-note', methods=['PUT'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def autosave_soap_note(encounter_id):
    """Auto-save SOAP note (for auto-save feature)"""
    try:
        encounter = ClinicalEncounter.query.get_or_404(encounter_id)
        data = request.get_json()
        
        # Update SOAP fields
        if 'subjective' in data:
            encounter.history_present_illness = data['subjective']
        if 'objective' in data:
            encounter.physical_exam = data.get('objective', '')
        if 'assessment' in data:
            encounter.assessment = data['assessment']
        if 'plan' in data:
            encounter.plan = data['plan']
        
        encounter.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'SOAP note auto-saved',
            'timestamp': encounter.updated_at.isoformat()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Get SOAP Templates
@doctor_bp.route('/soap-templates', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_soap_templates():
    """Get SOAP note templates"""
    try:
        query = SOAPTemplate.query.filter_by(is_active=True)
        specialty = request.args.get('specialty')
        if specialty:
            query = query.filter(SOAPTemplate.specialty.ilike(specialty))
        templates = [row.to_dict() for row in query.order_by(SOAPTemplate.name.asc()).all()]
        
        return jsonify({
            'success': True,
            'templates': templates
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Check Drug Interactions
@doctor_bp.route('/check-drug-interactions', methods=['POST'])
@token_required
@role_required(['Physician', 'Pharmacist', 'System Administrator'])
def check_drug_interactions():
    """Check for drug-drug interactions"""
    try:
        data = request.get_json()
        patient_id = data.get('patient_id')
        new_medications = data.get('medications', [])
        
        # Get patient's current medications
        current_meds = Medication.query.filter_by(
            patient_id=patient_id,
            is_active=True
        ).all()
        
        # Get patient allergies
        allergies = Allergy.query.filter_by(
            patient_id=patient_id,
            is_active=True
        ).all()
        
        interactions = []
        
        # Check against allergies
        for allergy in allergies:
            for new_med in new_medications:
                if allergy.allergen.lower() in new_med.lower():
                    interactions.append({
                        'type': 'allergy',
                        'severity': 'critical',
                        'drug1': new_med,
                        'drug2': allergy.allergen,
                        'description': f'Patient has documented allergy to {allergy.allergen}',
                        'recommendation': 'DO NOT PRESCRIBE - Choose alternative medication'
                    })
        
        # Resolve current/new meds to formulary IDs and fetch recorded interactions
        current_drug_ids = set()
        for med in current_meds:
            matched = Drug.query.filter(
                db.or_(Drug.drug_name.ilike(med.medication_name), Drug.generic_name.ilike(med.medication_name))
            ).first()
            if matched:
                current_drug_ids.add(matched.id)

        new_names = []
        for med in new_medications:
            if isinstance(med, dict):
                new_names.append(med.get('name', '').strip())
            else:
                new_names.append(str(med).strip())
        new_names = [m for m in new_names if m]
        new_drugs = []
        for med_name in new_names:
            matched = Drug.query.filter(
                db.or_(Drug.drug_name.ilike(med_name), Drug.generic_name.ilike(med_name))
            ).first()
            if matched:
                new_drugs.append((med_name, matched))

        if current_drug_ids and new_drugs:
            new_ids = [drug.id for _, drug in new_drugs]
            interaction_rows = DrugInteraction.query.filter(
                db.or_(
                    db.and_(DrugInteraction.drug1_id.in_(current_drug_ids), DrugInteraction.drug2_id.in_(new_ids)),
                    db.and_(DrugInteraction.drug2_id.in_(current_drug_ids), DrugInteraction.drug1_id.in_(new_ids))
                )
            ).all()
            for row in interaction_rows:
                primary = Drug.query.get(row.drug1_id)
                secondary = Drug.query.get(row.drug2_id)
                interactions.append({
                    'type': 'drug_interaction',
                    'severity': row.severity or 'moderate',
                    'drug1': primary.drug_name if primary else f'Drug #{row.drug1_id}',
                    'drug2': secondary.drug_name if secondary else f'Drug #{row.drug2_id}',
                    'description': row.description or 'Potential interaction detected',
                    'recommendation': row.clinical_significance or 'Review medication combination'
                })
        
        return jsonify({
            'success': True,
            'interactions': interactions,
            'interaction_count': len(interactions),
            'has_critical': any(i['severity'] == 'critical' for i in interactions)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
