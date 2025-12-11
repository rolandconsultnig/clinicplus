"""
Clinical Forms Routes - Handle all OpenEMR clinical form types
"""
from flask import Blueprint, request, jsonify
from src.models.clinical_forms import ClinicalForm, SOAPForm, PhysicalExamForm, ReviewOfSystemsForm, FORM_TYPES
from src.models.patient import Patient
from src.models.clinical import ClinicalEncounter
from src.models.user import db
from src.auth.jwt_manager import token_required, role_required
from datetime import datetime
import uuid

clinical_forms_bp = Blueprint('clinical_forms', __name__)

@clinical_forms_bp.route('/types', methods=['GET'])
@token_required
def get_form_types():
    """Get list of all available form types"""
    return jsonify({'success': True, 'form_types': FORM_TYPES}), 200

@clinical_forms_bp.route('/<form_type>/<int:patient_id>', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def create_form(form_type, patient_id):
    """Create a new clinical form"""
    try:
        if form_type not in FORM_TYPES:
            return jsonify({'error': f'Invalid form type: {form_type}'}), 400
        
        patient = Patient.query.get_or_404(patient_id)
        data = request.get_json()
        
        encounter_id = data.get('encounter_id')
        if encounter_id:
            encounter = ClinicalEncounter.query.get(encounter_id)
            if not encounter:
                return jsonify({'error': 'Encounter not found'}), 404
        
        # Create form
        form = ClinicalForm(
            form_id=str(uuid.uuid4()),
            form_type=form_type,
            form_name=FORM_TYPES.get(form_type, form_type),
            patient_id=patient_id,
            encounter_id=encounter_id,
            provider_id=data.get('provider_id'),
            created_by=request.current_user.id if hasattr(request, 'current_user') else None,
            form_date=datetime.utcnow()
        )
        
        # Store form data
        form.set_form_data(data.get('form_data', {}))
        
        db.session.add(form)
        db.session.commit()
        
        return jsonify({'success': True, 'form': form.to_dict()}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@clinical_forms_bp.route('/<form_type>/<int:patient_id>', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_forms(form_type, patient_id):
    """Get all forms of a specific type for a patient"""
    try:
        forms = ClinicalForm.query.filter_by(
            patient_id=patient_id,
            form_type=form_type
        ).order_by(ClinicalForm.form_date.desc()).all()
        
        return jsonify({
            'success': True,
            'forms': [f.to_dict() for f in forms]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@clinical_forms_bp.route('/<int:form_id>', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_form(form_id):
    """Get a specific form by ID"""
    try:
        form = ClinicalForm.query.get_or_404(form_id)
        return jsonify({'success': True, 'form': form.to_dict()}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@clinical_forms_bp.route('/<int:form_id>', methods=['PUT'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def update_form(form_id):
    """Update a clinical form"""
    try:
        form = ClinicalForm.query.get_or_404(form_id)
        
        if form.is_locked:
            return jsonify({'error': 'Form is locked and cannot be modified'}), 400
        
        data = request.get_json()
        
        # Update form data
        if 'form_data' in data:
            form.set_form_data(data['form_data'])
        
        # Update status
        if 'form_status' in data:
            form.form_status = data['form_status']
            if data['form_status'] == 'completed':
                form.completed_date = datetime.utcnow()
            if data['form_status'] == 'signed':
                form.signed_date = datetime.utcnow()
        
        form.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({'success': True, 'form': form.to_dict()}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@clinical_forms_bp.route('/<int:form_id>', methods=['DELETE'])
@token_required
@role_required(['Physician', 'System Administrator'])
def delete_form(form_id):
    """Delete a clinical form"""
    try:
        form = ClinicalForm.query.get_or_404(form_id)
        
        if form.is_locked:
            return jsonify({'error': 'Form is locked and cannot be deleted'}), 400
        
        db.session.delete(form)
        db.session.commit()
        
        return jsonify({'success': True}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@clinical_forms_bp.route('/patient/<int:patient_id>', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_patient_forms(patient_id):
    """Get all forms for a patient"""
    try:
        forms = ClinicalForm.query.filter_by(patient_id=patient_id)\
            .order_by(ClinicalForm.form_date.desc()).all()
        
        # Group by form type
        forms_by_type = {}
        for form in forms:
            if form.form_type not in forms_by_type:
                forms_by_type[form.form_type] = []
            forms_by_type[form.form_type].append(form.to_dict())
        
        return jsonify({
            'success': True,
            'forms': [f.to_dict() for f in forms],
            'forms_by_type': forms_by_type
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@clinical_forms_bp.route('/encounter/<int:encounter_id>', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_encounter_forms(encounter_id):
    """Get all forms for an encounter"""
    try:
        forms = ClinicalForm.query.filter_by(encounter_id=encounter_id)\
            .order_by(ClinicalForm.form_date.desc()).all()
        
        return jsonify({
            'success': True,
            'forms': [f.to_dict() for f in forms]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Specific form type routes for convenience

@clinical_forms_bp.route('/soap/<int:patient_id>', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse'])
def create_soap_form(patient_id):
    """Create SOAP note form"""
    try:
        data = request.get_json()
        
        soap_form = SOAPForm(
            patient_id=patient_id,
            encounter_id=data.get('encounter_id'),
            subjective=data.get('subjective'),
            objective=data.get('objective'),
            assessment=data.get('assessment'),
            plan=data.get('plan'),
            provider_id=data.get('provider_id'),
            form_date=datetime.utcnow()
        )
        
        db.session.add(soap_form)
        db.session.commit()
        
        return jsonify({'success': True, 'form': soap_form.to_dict()}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@clinical_forms_bp.route('/physical-exam/<int:patient_id>', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse'])
def create_physical_exam_form(patient_id):
    """Create physical exam form"""
    try:
        data = request.get_json()
        
        exam_form = PhysicalExamForm(
            patient_id=patient_id,
            encounter_id=data.get('encounter_id'),
            general_appearance=data.get('general_appearance'),
            head_neck=data.get('head_neck'),
            eyes=data.get('eyes'),
            ears=data.get('ears'),
            nose_throat=data.get('nose_throat'),
            cardiovascular=data.get('cardiovascular'),
            respiratory=data.get('respiratory'),
            abdomen=data.get('abdomen'),
            genitourinary=data.get('genitourinary'),
            musculoskeletal=data.get('musculoskeletal'),
            neurological=data.get('neurological'),
            skin=data.get('skin'),
            lymph_nodes=data.get('lymph_nodes'),
            other=data.get('other'),
            provider_id=data.get('provider_id'),
            form_date=datetime.utcnow()
        )
        
        db.session.add(exam_form)
        db.session.commit()
        
        return jsonify({'success': True, 'form': exam_form.to_dict()}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@clinical_forms_bp.route('/ros/<int:patient_id>', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse'])
def create_ros_form(patient_id):
    """Create Review of Systems form"""
    try:
        data = request.get_json()
        
        ros_form = ReviewOfSystemsForm(
            patient_id=patient_id,
            encounter_id=data.get('encounter_id'),
            constitutional=data.get('constitutional'),
            eyes=data.get('eyes'),
            ears_nose_throat=data.get('ears_nose_throat'),
            cardiovascular=data.get('cardiovascular'),
            respiratory=data.get('respiratory'),
            gastrointestinal=data.get('gastrointestinal'),
            genitourinary=data.get('genitourinary'),
            musculoskeletal=data.get('musculoskeletal'),
            integumentary=data.get('integumentary'),
            neurological=data.get('neurological'),
            psychiatric=data.get('psychiatric'),
            endocrine=data.get('endocrine'),
            hematologic_lymphatic=data.get('hematologic_lymphatic'),
            allergic_immunologic=data.get('allergic_immunologic'),
            provider_id=data.get('provider_id'),
            form_date=datetime.utcnow()
        )
        
        db.session.add(ros_form)
        db.session.commit()
        
        return jsonify({'success': True, 'form': ros_form.to_dict()}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

