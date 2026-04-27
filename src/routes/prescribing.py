"""
ePrescribing API Routes with Drug Interaction Checks
"""
from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.auth.tenant_middleware import tenant_isolation_required
from src.models.user import db
from src.models.prescribing import Drug, DrugInteraction, DrugAllergyInteraction, Prescription, PrescriptionRefill
from src.models.patient import Patient, Allergy
from src.models.auth import AuditLog
from src.services.prescribing_safety import (
    collect_prescription_warnings,
    blocking_warnings,
    warnings_json,
)
from datetime import datetime, date
import uuid
import json

prescribing_bp = Blueprint('prescribing', __name__)

# Drug Database
@prescribing_bp.route('/drugs', methods=['GET'])
@token_required
def search_drugs():
    """Search drugs in database"""
    try:
        search = request.args.get('search', '')
        drug_class = request.args.get('drug_class')
        is_controlled = request.args.get('is_controlled', type=bool)
        
        query = Drug.query.filter(Drug.is_active == True)
        
        if search:
            query = query.filter(
                db.or_(
                    Drug.drug_name.contains(search),
                    Drug.generic_name.contains(search),
                    Drug.rxnorm_code.contains(search)
                )
            )
        if drug_class:
            query = query.filter(Drug.drug_class == drug_class)
        if is_controlled is not None:
            query = query.filter(Drug.is_controlled == is_controlled)
        
        drugs = query.limit(50).all()
        
        return jsonify({
            'success': True,
            'drugs': [d.to_dict() for d in drugs]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@prescribing_bp.route('/drugs/<int:drug_id>/interactions', methods=['GET'])
@token_required
def get_drug_interactions(drug_id):
    """Get drug interactions for a specific drug"""
    try:
        interactions = DrugInteraction.query.filter(
            db.or_(
                DrugInteraction.drug1_id == drug_id,
                DrugInteraction.drug2_id == drug_id
            )
        ).all()
        
        return jsonify({
            'success': True,
            'interactions': [i.to_dict() for i in interactions]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@prescribing_bp.route('/prescriptions/check-interactions', methods=['POST'])
@token_required
def check_drug_interactions():
    """Check for drug interactions before prescribing"""
    try:
        data = request.get_json()
        drug_ids = data.get('drug_ids', [])
        patient_id = data.get('patient_id')
        
        warnings = []
        
        # Check drug-drug interactions
        for i, drug1_id in enumerate(drug_ids):
            for drug2_id in drug_ids[i+1:]:
                interaction = DrugInteraction.query.filter(
                    db.or_(
                        db.and_(DrugInteraction.drug1_id == drug1_id, DrugInteraction.drug2_id == drug2_id),
                        db.and_(DrugInteraction.drug1_id == drug2_id, DrugInteraction.drug2_id == drug1_id)
                    )
                ).first()
                
                if interaction:
                    warnings.append({
                        'type': 'drug_interaction',
                        'severity': interaction.severity,
                        'drug1_id': drug1_id,
                        'drug2_id': drug2_id,
                        'description': interaction.description
                    })
        
        # Check drug-allergy interactions
        if patient_id:
            patient_allergies = Allergy.query.filter(Allergy.patient_id == patient_id).all()
            allergen_names = [a.allergen.lower() for a in patient_allergies]
            
            for drug_id in drug_ids:
                drug = Drug.query.get(drug_id)
                if drug:
                    drug_name_lower = drug.drug_name.lower()
                    generic_name_lower = (drug.generic_name or '').lower()
                    
                    for allergen in allergen_names:
                        if allergen in drug_name_lower or allergen in generic_name_lower:
                            warnings.append({
                                'type': 'drug_allergy',
                                'severity': 'severe',
                                'drug_id': drug_id,
                                'allergen': allergen,
                                'description': f'Patient is allergic to {allergen}'
                            })
        
        return jsonify({
            'success': True,
            'has_interactions': len(warnings) > 0,
            'warnings': warnings
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Prescriptions
@prescribing_bp.route('/prescriptions', methods=['POST'])
@token_required
@role_required(['physician', 'nurse_practitioner'])
def create_prescription():
    """Create a new prescription"""
    try:
        data = request.get_json()
        
        # Check for interactions
        patient_id = data['patient_id']
        drug_id = data['drug_id']
        
        warnings = collect_prescription_warnings(patient_id, drug_id)
        blockers = blocking_warnings(warnings)
        if blockers:
            return jsonify({
                'success': False,
                'error': 'Drug interaction, contraindication, or allergy blocks this prescription',
                'warnings': warnings,
                'blocking': blockers,
            }), 400

        drug = Drug.query.get_or_404(drug_id)
        
        prescription = Prescription(
            prescription_id=f"RX-{uuid.uuid4().hex[:12].upper()}",
            patient_id=patient_id,
            provider_id=data['provider_id'],
            facility_id=data['facility_id'],
            encounter_id=data.get('encounter_id'),
            drug_id=drug_id,
            drug_name=drug.drug_name,
            rxnorm_code=drug.rxnorm_code,
            dosage=data['dosage'],
            frequency=data['frequency'],
            route=data.get('route', 'oral'),
            quantity=data['quantity'],
            days_supply=data.get('days_supply'),
            refills=data.get('refills', 0),
            refills_remaining=data.get('refills', 0),
            sig=data.get('sig'),
            patient_instructions=data.get('patient_instructions'),
            prescribed_date=date.fromisoformat(data.get('prescribed_date', date.today().isoformat())),
            start_date=date.fromisoformat(data['start_date']) if data.get('start_date') else None,
            end_date=date.fromisoformat(data['end_date']) if data.get('end_date') else None,
            drug_interaction_checked=True,
            allergy_checked=True,
            interaction_warnings=warnings_json(warnings),
            dea_required=drug.is_controlled,
            created_by=request.current_user.id
        )
        
        db.session.add(prescription)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'prescription': prescription.to_dict(),
            'warnings': warnings if warnings else []
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@prescribing_bp.route('/prescriptions', methods=['GET'])
@token_required
@tenant_isolation_required
def get_prescriptions():
    """Get prescriptions"""
    try:
        patient_id = request.args.get('patient_id', type=int)
        provider_id = request.args.get('provider_id', type=int)
        status = request.args.get('status')
        
        query = Prescription.query
        
        if patient_id:
            query = query.filter(Prescription.patient_id == patient_id)
        if provider_id:
            query = query.filter(Prescription.provider_id == provider_id)
        if status:
            query = query.filter(Prescription.status == status)
        
        prescriptions = query.order_by(Prescription.prescribed_date.desc()).all()
        
        return jsonify({
            'success': True,
            'prescriptions': [p.to_dict() for p in prescriptions]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@prescribing_bp.route('/prescriptions/<int:prescription_id>/refill', methods=['POST'])
@token_required
@role_required(['pharmacist', 'physician'])
def refill_prescription(prescription_id):
    """Refill a prescription"""
    try:
        prescription = Prescription.query.get_or_404(prescription_id)
        
        if prescription.refills_remaining <= 0:
            return jsonify({'error': 'No refills remaining'}), 400
        
        data = request.get_json()
        
        refill = PrescriptionRefill(
            prescription_id=prescription_id,
            pharmacy_id=data.get('pharmacy_id'),
            refill_date=date.today(),
            refill_number=prescription.refills - prescription.refills_remaining + 1,
            quantity_dispensed=data.get('quantity_dispensed', prescription.quantity),
            dispensed_by=request.current_user.id
        )
        
        prescription.refills_remaining -= 1
        if prescription.refills_remaining == 0:
            prescription.status = 'completed'
        
        db.session.add(refill)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'refill': refill.to_dict(),
            'prescription': prescription.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

