"""
Patient File Management Routes - Comprehensive OpenEMR-style patient file management
"""
from flask import Blueprint, request, jsonify
from src.models.patient import Patient, PatientHistory, PatientPhoto, MedicalHistory, Allergy, Medication
from src.models.user import db
from src.auth.jwt_manager import token_required, role_required
from datetime import datetime
import json

patient_file_bp = Blueprint('patient_file', __name__)

@patient_file_bp.route('/summary/<int:patient_id>', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator', 'Receptionist'])
def get_patient_summary(patient_id):
    """Get comprehensive patient summary dashboard"""
    try:
        patient = Patient.query.get_or_404(patient_id)
        
        # Get all related data
        medical_history = MedicalHistory.query.filter_by(patient_id=patient_id, is_active=True).all()
        allergies = Allergy.query.filter_by(patient_id=patient_id, is_active=True).all()
        medications = Medication.query.filter_by(patient_id=patient_id, is_active=True).all()
        
        # Get recent encounters (if ClinicalEncounter model exists)
        from src.models.clinical import ClinicalEncounter
        recent_encounters = ClinicalEncounter.query.filter_by(patient_id=patient_id)\
            .order_by(ClinicalEncounter.encounter_date.desc()).limit(5).all()
        
        # Get patient history
        patient_history = PatientHistory.query.filter_by(patient_id=patient_id)\
            .order_by(PatientHistory.date.desc()).limit(10).all()
        
        # Get patient photo
        photo = PatientPhoto.query.filter_by(patient_id=patient_id, is_primary=True).first()
        
        summary = {
            'patient': patient.to_dict(),
            'photo': photo.to_dict() if photo else None,
            'medical_history': [mh.to_dict() for mh in medical_history],
            'allergies': [a.to_dict() for a in allergies],
            'medications': [m.to_dict() for m in medications],
            'recent_encounters': [enc.to_dict() if hasattr(enc, 'to_dict') else {
                'id': enc.id,
                'encounter_date': enc.encounter_date.isoformat() if hasattr(enc, 'encounter_date') else None,
                'encounter_type': enc.encounter_type if hasattr(enc, 'encounter_type') else None
            } for enc in recent_encounters],
            'patient_history': [ph.to_dict() for ph in patient_history],
            'stats': {
                'total_encounters': ClinicalEncounter.query.filter_by(patient_id=patient_id).count(),
                'active_conditions': len([mh for mh in medical_history if mh.status == 'active']),
                'active_allergies': len(allergies),
                'active_medications': len(medications)
            }
        }
        
        return jsonify({'success': True, 'summary': summary}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@patient_file_bp.route('/demographics/<int:patient_id>', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator', 'Receptionist'])
def get_patient_demographics(patient_id):
    """Get full patient demographics"""
    try:
        patient = Patient.query.get_or_404(patient_id)
        return jsonify({'success': True, 'demographics': patient.to_dict()}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@patient_file_bp.route('/demographics/<int:patient_id>', methods=['PUT'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator', 'Receptionist'])
def update_patient_demographics(patient_id):
    """Update patient demographics with history tracking"""
    try:
        patient = Patient.query.get_or_404(patient_id)
        data = request.get_json()
        
        # Track name changes
        name_changed = False
        if 'first_name' in data and data['first_name'] != patient.first_name:
            name_changed = True
        if 'last_name' in data and data['last_name'] != patient.last_name:
            name_changed = True
        
        # Create history entry if name changed
        if name_changed:
            history = PatientHistory(
                patient_id=patient_id,
                history_type_key='name_change',
                previous_name_first=patient.first_name,
                previous_name_last=patient.last_name,
                previous_name_middle=patient.middle_name,
                previous_name_suffix=patient.suffix,
                previous_name_enddate=datetime.utcnow().date(),
                created_by=request.current_user.id if hasattr(request, 'current_user') else None
            )
            db.session.add(history)
        
        # Update patient fields
        for key, value in data.items():
            if hasattr(patient, key) and key not in ['id', 'created_at', 'created_by']:
                setattr(patient, key, value)
        
        patient.updated_at = datetime.utcnow()
        patient.updated_by = request.current_user.id if hasattr(request, 'current_user') else None
        
        db.session.commit()
        
        return jsonify({'success': True, 'patient': patient.to_dict()}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@patient_file_bp.route('/history/<int:patient_id>', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_patient_history(patient_id):
    """Get patient history (encounters, problems, medications, allergies, immunizations)"""
    try:
        patient = Patient.query.get_or_404(patient_id)
        
        # Get encounter history
        from src.models.clinical import ClinicalEncounter
        encounters = ClinicalEncounter.query.filter_by(patient_id=patient_id)\
            .order_by(ClinicalEncounter.encounter_date.desc()).all()
        
        # Get problem list
        problems = MedicalHistory.query.filter_by(patient_id=patient_id)\
            .order_by(MedicalHistory.diagnosis_date.desc()).all()
        
        # Get medication history
        medications = Medication.query.filter_by(patient_id=patient_id)\
            .order_by(Medication.start_date.desc()).all()
        
        # Get allergy history
        allergies = Allergy.query.filter_by(patient_id=patient_id)\
            .order_by(Allergy.onset_date.desc()).all()
        
        # Get immunization history (if model exists)
        immunization_history = []
        try:
            from src.models.clinical import Immunization
            immunization_history = Immunization.query.filter_by(patient_id=patient_id)\
                .order_by(Immunization.administered_date.desc()).all()
        except:
            pass
        
        history = {
            'encounters': [enc.to_dict() if hasattr(enc, 'to_dict') else {
                'id': enc.id,
                'encounter_date': enc.encounter_date.isoformat() if hasattr(enc, 'encounter_date') else None,
                'encounter_type': enc.encounter_type if hasattr(enc, 'encounter_type') else None
            } for enc in encounters],
            'problems': [p.to_dict() for p in problems],
            'medications': [m.to_dict() for m in medications],
            'allergies': [a.to_dict() for a in allergies],
            'immunizations': [imm.to_dict() if hasattr(imm, 'to_dict') else {} for imm in immunization_history]
        }
        
        return jsonify({'success': True, 'history': history}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@patient_file_bp.route('/photo/<int:patient_id>', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator', 'Receptionist'])
def upload_patient_photo(patient_id):
    """Upload patient photo"""
    try:
        patient = Patient.query.get_or_404(patient_id)
        
        # Handle file upload (simplified - in production use proper file handling)
        if 'photo' not in request.files:
            return jsonify({'error': 'No photo file provided'}), 400
        
        photo_file = request.files['photo']
        # In production, save file and get URL
        photo_url = f'/uploads/patients/{patient_id}/{photo_file.filename}'
        
        # Set existing primary photo to non-primary
        PatientPhoto.query.filter_by(patient_id=patient_id, is_primary=True).update({'is_primary': False})
        
        # Create new photo record
        photo = PatientPhoto(
            patient_id=patient_id,
            photo_url=photo_url,
            is_primary=True,
            created_by=request.current_user.id if hasattr(request, 'current_user') else None
        )
        db.session.add(photo)
        db.session.commit()
        
        return jsonify({'success': True, 'photo': photo.to_dict()}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@patient_file_bp.route('/reminders/<int:patient_id>', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_patient_reminders(patient_id):
    """Get clinical reminders for patient"""
    try:
        from src.models.clinical_reminders import ClinicalReminder
        reminders = ClinicalReminder.query.filter_by(patient_id=patient_id, is_active=True).all()
        
        return jsonify({
            'success': True,
            'reminders': [r.to_dict() if hasattr(r, 'to_dict') else {} for r in reminders]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@patient_file_bp.route('/stats/<int:patient_id>', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_patient_stats(patient_id):
    """Get patient statistics"""
    try:
        patient = Patient.query.get_or_404(patient_id)
        
        from src.models.clinical import ClinicalEncounter
        from src.models.scheduling import Appointment
        
        stats = {
            'total_encounters': ClinicalEncounter.query.filter_by(patient_id=patient_id).count(),
            'total_appointments': Appointment.query.filter_by(patient_id=patient_id).count(),
            'active_conditions': MedicalHistory.query.filter_by(patient_id=patient_id, status='active', is_active=True).count(),
            'active_allergies': Allergy.query.filter_by(patient_id=patient_id, is_active=True).count(),
            'active_medications': Medication.query.filter_by(patient_id=patient_id, status='active', is_active=True).count(),
            'age': (datetime.utcnow().date() - patient.date_of_birth).days // 365 if patient.date_of_birth else None
        }
        
        return jsonify({'success': True, 'stats': stats}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

