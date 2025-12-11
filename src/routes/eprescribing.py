"""
ePrescribing Routes - Comprehensive OpenEMR-style ePrescribing
Includes prescription writing, renewals, EPCS, drug interaction checking
"""
from flask import Blueprint, request, jsonify
from src.models.prescribing import Prescription, DrugInteraction, Drug
from src.models.patient import Patient, Allergy
from src.models.user import db
from src.auth.jwt_manager import token_required, role_required
from datetime import datetime, date, timedelta
import uuid

eprescribing_bp = Blueprint('eprescribing', __name__)

@eprescribing_bp.route('/prescribe', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'System Administrator'])
def create_prescription():
    """Create new prescription with drug interaction checking"""
    try:
        data = request.get_json()
        patient_id = data['patient_id']
        provider_id = data.get('provider_id')
        
        patient = Patient.query.get_or_404(patient_id)
        
        # Get patient's active medications
        from src.models.patient import Medication
        active_medications = Medication.query.filter_by(
            patient_id=patient_id,
            status='active',
            is_active=True
        ).all()
        
        # Get patient's allergies
        allergies = Allergy.query.filter_by(
            patient_id=patient_id,
            is_active=True
        ).all()
        
        # Check for drug interactions
        drug_name = data.get('drug_name') or data.get('medication_name')
        interactions = []
        warnings = []
        
        if drug_name:
            # Check drug-drug interactions
            for med in active_medications:
                interaction = DrugInteraction.query.filter(
                    db.or_(
                        db.and_(
                            DrugInteraction.drug1_name == med.medication_name,
                            DrugInteraction.drug2_name == drug_name
                        ),
                        db.and_(
                            DrugInteraction.drug1_name == drug_name,
                            DrugInteraction.drug2_name == med.medication_name
                        )
                    )
                ).first()
                
                if interaction:
                    interactions.append({
                        'type': 'drug-drug',
                        'severity': interaction.severity,
                        'description': interaction.description,
                        'interacting_drug': med.medication_name
                    })
            
            # Check drug-allergy interactions
            for allergy in allergies:
                if allergy.allergen.lower() in drug_name.lower() or drug_name.lower() in allergy.allergen.lower():
                    warnings.append({
                        'type': 'drug-allergy',
                        'severity': 'severe',
                        'description': f'Patient is allergic to {allergy.allergen}',
                        'allergen': allergy.allergen
                    })
        
        # Create prescription
        prescription = Prescription(
            prescription_id=f"RX-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}",
            patient_id=patient_id,
            provider_id=provider_id,
            drug_name=drug_name,
            dosage=data.get('dosage'),
            frequency=data.get('frequency'),
            route=data.get('route', 'oral'),
            quantity=data.get('quantity'),
            refills_allowed=data.get('refills_allowed', 0),
            start_date=datetime.fromisoformat(data.get('start_date', datetime.utcnow().isoformat())).date() if isinstance(data.get('start_date'), str) else data.get('start_date', date.today()),
            instructions=data.get('instructions'),
            status='active',
            created_by=request.current_user.id if hasattr(request, 'current_user') else None
        )
        
        db.session.add(prescription)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'prescription': prescription.to_dict() if hasattr(prescription, 'to_dict') else {
                'id': prescription.id,
                'prescription_id': prescription.prescription_id,
                'patient_id': prescription.patient_id,
                'drug_name': prescription.drug_name
            },
            'interactions': interactions,
            'warnings': warnings
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@eprescribing_bp.route('/renewal', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'System Administrator'])
def renew_prescription():
    """Renew an existing prescription"""
    try:
        data = request.get_json()
        prescription_id = data.get('prescription_id')
        prescription_db_id = data.get('prescription_db_id')
        
        # Find prescription
        if prescription_db_id:
            prescription = Prescription.query.get_or_404(prescription_db_id)
        elif prescription_id:
            prescription = Prescription.query.filter_by(prescription_id=prescription_id).first_or_404()
        else:
            return jsonify({'error': 'Prescription ID required'}), 400
        
        # Check refills remaining
        if prescription.refills_remaining <= 0:
            return jsonify({'error': 'No refills remaining'}), 400
        
        # Create renewal
        from src.models.prescribing import PrescriptionRefill
        renewal = PrescriptionRefill(
            prescription_id=prescription.id,
            refill_number=prescription.refills_used + 1,
            refill_date=date.today(),
            quantity=prescription.quantity,
            filled_by_pharmacy=data.get('pharmacy_id'),
            created_by=request.current_user.id if hasattr(request, 'current_user') else None
        )
        
        prescription.refills_used += 1
        prescription.refills_remaining -= 1
        
        db.session.add(renewal)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'renewal': {
                'id': renewal.id,
                'refill_number': renewal.refill_number,
                'refill_date': renewal.refill_date.isoformat() if renewal.refill_date else None
            },
            'prescription': prescription.to_dict() if hasattr(prescription, 'to_dict') else {}
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@eprescribing_bp.route('/check-interactions', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'System Administrator'])
def check_drug_interactions():
    """Check for drug interactions"""
    try:
        data = request.get_json()
        patient_id = data.get('patient_id')
        drug_name = data['drug_name']
        
        interactions = []
        warnings = []
        
        if patient_id:
            patient = Patient.query.get(patient_id)
            if patient:
                # Get active medications
                from src.models.patient import Medication
                active_medications = Medication.query.filter_by(
                    patient_id=patient_id,
                    status='active',
                    is_active=True
                ).all()
                
                # Check drug-drug interactions
                for med in active_medications:
                    interaction = DrugInteraction.query.filter(
                        db.or_(
                            db.and_(
                                DrugInteraction.drug1_name == med.medication_name,
                                DrugInteraction.drug2_name == drug_name
                            ),
                            db.and_(
                                DrugInteraction.drug1_name == drug_name,
                                DrugInteraction.drug2_name == med.medication_name
                            )
                        )
                    ).first()
                    
                    if interaction:
                        interactions.append({
                            'type': 'drug-drug',
                            'severity': interaction.severity,
                            'description': interaction.description,
                            'interacting_drug': med.medication_name
                        })
                
                # Check allergies
                allergies = Allergy.query.filter_by(
                    patient_id=patient_id,
                    is_active=True
                ).all()
                
                for allergy in allergies:
                    if allergy.allergen.lower() in drug_name.lower() or drug_name.lower() in allergy.allergen.lower():
                        warnings.append({
                            'type': 'drug-allergy',
                            'severity': 'severe',
                            'description': f'Patient is allergic to {allergy.allergen}',
                            'allergen': allergy.allergen
                        })
        
        return jsonify({
            'success': True,
            'interactions': interactions,
            'warnings': warnings
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@eprescribing_bp.route('/epcs/admin', methods=['GET'])
@token_required
@role_required(['System Administrator'])
def get_epcs_admin():
    """Get EPCS (Electronic Prescribing of Controlled Substances) administration"""
    # EPCS configuration and management
    epcs_config = {
        'enabled': False,
        'two_factor_required': True,
        'biometric_required': False,
        'hardware_token_required': False
    }
    
    return jsonify({'success': True, 'epcs_config': epcs_config}), 200

