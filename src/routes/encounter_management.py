"""
Encounter Management Routes - Comprehensive OpenEMR-style encounter management
Handles encounter creation, forms loading, coding, superbill, fee sheet, etc.
"""
from flask import Blueprint, request, jsonify
from src.models.clinical import ClinicalEncounter
from src.models.clinical_forms import ClinicalForm, FORM_TYPES
from src.models.patient import Patient
from src.models.user import db
from src.auth.jwt_manager import token_required, role_required
from datetime import datetime
import uuid
import json

encounter_mgmt_bp = Blueprint('encounter_mgmt', __name__)

@encounter_mgmt_bp.route('/create', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse', 'Receptionist', 'System Administrator'])
def create_encounter():
    """Create a new encounter"""
    try:
        data = request.get_json()
        
        encounter = ClinicalEncounter(
            encounter_id=str(uuid.uuid4()),
            patient_id=data['patient_id'],
            provider_id=data.get('provider_id'),
            facility_id=data.get('facility_id'),
            encounter_type=data.get('encounter_type', 'office_visit'),
            encounter_date=datetime.fromisoformat(data['encounter_date']) if isinstance(data.get('encounter_date'), str) else data.get('encounter_date', datetime.utcnow()),
            encounter_status='in_progress',
            chief_complaint=data.get('chief_complaint'),
            visit_reason=data.get('visit_reason')
        )
        
        db.session.add(encounter)
        db.session.commit()
        
        return jsonify({'success': True, 'encounter': encounter.to_dict()}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@encounter_mgmt_bp.route('/<int:encounter_id>/forms', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_encounter_forms(encounter_id):
    """Get all forms for an encounter"""
    try:
        encounter = ClinicalEncounter.query.get_or_404(encounter_id)
        forms = ClinicalForm.query.filter_by(encounter_id=encounter_id).all()
        
        return jsonify({
            'success': True,
            'encounter': encounter.to_dict(),
            'forms': [f.to_dict() for f in forms],
            'available_form_types': FORM_TYPES
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@encounter_mgmt_bp.route('/<int:encounter_id>/load-form/<form_type>', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def load_encounter_form(encounter_id, form_type):
    """Load/create a form for an encounter"""
    try:
        encounter = ClinicalEncounter.query.get_or_404(encounter_id)
        
        if form_type not in FORM_TYPES:
            return jsonify({'error': f'Invalid form type: {form_type}'}), 400
        
        # Check if form already exists
        existing_form = ClinicalForm.query.filter_by(
            encounter_id=encounter_id,
            form_type=form_type
        ).first()
        
        if existing_form:
            return jsonify({'success': True, 'form': existing_form.to_dict()}), 200
        
        # Create new form
        form = ClinicalForm(
            form_id=str(uuid.uuid4()),
            form_type=form_type,
            form_name=FORM_TYPES.get(form_type),
            patient_id=encounter.patient_id,
            encounter_id=encounter_id,
            provider_id=encounter.provider_id,
            created_by=request.current_user.id if hasattr(request, 'current_user') else None,
            form_date=datetime.utcnow()
        )
        
        db.session.add(form)
        db.session.commit()
        
        return jsonify({'success': True, 'form': form.to_dict()}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@encounter_mgmt_bp.route('/<int:encounter_id>/coding', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_encounter_coding(encounter_id):
    """Get coding information for encounter (CPT, ICD-10)"""
    try:
        encounter = ClinicalEncounter.query.get_or_404(encounter_id)
        
        billing_codes = []
        diagnosis_codes = []
        
        if encounter.billing_codes:
            try:
                billing_codes = json.loads(encounter.billing_codes)
            except:
                pass
        
        if encounter.diagnosis_codes:
            try:
                diagnosis_codes = json.loads(encounter.diagnosis_codes)
            except:
                pass
        
        return jsonify({
            'success': True,
            'billing_codes': billing_codes,
            'diagnosis_codes': diagnosis_codes
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@encounter_mgmt_bp.route('/<int:encounter_id>/coding', methods=['PUT'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def update_encounter_coding(encounter_id):
    """Update coding information for encounter"""
    try:
        encounter = ClinicalEncounter.query.get_or_404(encounter_id)
        data = request.get_json()
        
        if 'billing_codes' in data:
            encounter.billing_codes = json.dumps(data['billing_codes'])
        
        if 'diagnosis_codes' in data:
            encounter.diagnosis_codes = json.dumps(data['diagnosis_codes'])
        
        encounter.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({'success': True, 'encounter': encounter.to_dict()}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@encounter_mgmt_bp.route('/<int:encounter_id>/superbill', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_superbill(encounter_id):
    """Generate superbill for encounter"""
    try:
        encounter = ClinicalEncounter.query.get_or_404(encounter_id)
        patient = Patient.query.get(encounter.patient_id)
        
        billing_codes = []
        diagnosis_codes = []
        
        if encounter.billing_codes:
            try:
                billing_codes = json.loads(encounter.billing_codes)
            except:
                pass
        
        if encounter.diagnosis_codes:
            try:
                diagnosis_codes = json.loads(encounter.diagnosis_codes)
            except:
                pass
        
        superbill = {
            'encounter_id': encounter.encounter_id,
            'encounter_date': encounter.encounter_date.isoformat() if encounter.encounter_date else None,
            'patient': patient.to_dict() if patient else None,
            'provider_id': encounter.provider_id,
            'billing_codes': billing_codes,
            'diagnosis_codes': diagnosis_codes,
            'chief_complaint': encounter.chief_complaint,
            'assessment': encounter.assessment
        }
        
        return jsonify({'success': True, 'superbill': superbill}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@encounter_mgmt_bp.route('/<int:encounter_id>/fee-sheet', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_fee_sheet(encounter_id):
    """Get fee sheet for encounter"""
    try:
        encounter = ClinicalEncounter.query.get_or_404(encounter_id)
        
        # Get fee sheet form if exists
        fee_sheet_form = ClinicalForm.query.filter_by(
            encounter_id=encounter_id,
            form_type='fee_sheet'
        ).first()
        
        return jsonify({
            'success': True,
            'encounter': encounter.to_dict(),
            'fee_sheet': fee_sheet_form.to_dict() if fee_sheet_form else None
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@encounter_mgmt_bp.route('/<int:encounter_id>/complete', methods=['PUT'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def complete_encounter(encounter_id):
    """Mark encounter as completed"""
    try:
        encounter = ClinicalEncounter.query.get_or_404(encounter_id)
        data = request.get_json()
        
        encounter.encounter_status = 'completed'
        encounter.assessment = data.get('assessment', encounter.assessment)
        encounter.plan = data.get('plan', encounter.plan)
        encounter.notes = data.get('notes', encounter.notes)
        
        if 'follow_up_required' in data:
            encounter.follow_up_required = data['follow_up_required']
            if data.get('follow_up_date'):
                encounter.follow_up_date = datetime.fromisoformat(data['follow_up_date']) if isinstance(data['follow_up_date'], str) else data['follow_up_date']
        
        encounter.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({'success': True, 'encounter': encounter.to_dict()}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

