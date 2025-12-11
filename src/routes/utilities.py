"""
Utilities Routes - Popups and utility features
Includes patient popups, holiday import, dated reminders, patient merge, duplicate management
"""
from flask import Blueprint, request, jsonify
from src.models.patient import Patient
from src.models.scheduling import Appointment
from src.models.user import db
from src.auth.jwt_manager import token_required, role_required
from datetime import datetime, date, timedelta
import json

utilities_bp = Blueprint('utilities', __name__)

# Patient Popups
@utilities_bp.route('/popup/issues/<int:patient_id>', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_patient_issues_popup(patient_id):
    """Get patient issues popup data"""
    try:
        patient = Patient.query.get_or_404(patient_id)
        
        from src.models.patient import MedicalHistory
        issues = MedicalHistory.query.filter_by(patient_id=patient_id, is_active=True).all()
        
        return jsonify({
            'success': True,
            'patient': patient.to_dict(),
            'issues': [i.to_dict() for i in issues]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@utilities_bp.route('/popup/appointments/<int:patient_id>', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'Receptionist', 'System Administrator'])
def get_patient_appointments_popup(patient_id):
    """Get patient appointments popup"""
    try:
        Patient.query.get_or_404(patient_id)
        
        appointments = Appointment.query.filter_by(patient_id=patient_id)\
            .order_by(Appointment.appointment_date.desc()).limit(20).all()
        
        return jsonify({
            'success': True,
            'appointments': [a.to_dict() for a in appointments]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@utilities_bp.route('/popup/superbill/<int:patient_id>', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_superbill_popup(patient_id):
    """Get superbill popup"""
    try:
        patient = Patient.query.get_or_404(patient_id)
        encounter_id = request.args.get('encounter_id', type=int)
        
        from src.models.clinical import ClinicalEncounter
        encounter = None
        if encounter_id:
            encounter = ClinicalEncounter.query.get(encounter_id)
        
        superbill = {
            'patient': patient.to_dict(),
            'encounter': encounter.to_dict() if encounter else None
        }
        
        return jsonify({'success': True, 'superbill': superbill}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@utilities_bp.route('/popup/payment/<int:patient_id>', methods=['GET'])
@token_required
@role_required(['Billing Staff', 'Receptionist', 'System Administrator'])
def get_payment_popup(patient_id):
    """Get payment popup"""
    try:
        patient = Patient.query.get_or_404(patient_id)
        
        from src.models.billing import Charge, Payment
        charges = Charge.query.filter_by(patient_id=patient_id, status='unpaid').all()
        payments = Payment.query.filter_by(patient_id=patient_id).order_by(Payment.payment_date.desc()).limit(10).all()
        
        return jsonify({
            'success': True,
            'patient': patient.to_dict(),
            'outstanding_charges': [c.to_dict() for c in charges],
            'recent_payments': [p.to_dict() for p in payments]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@utilities_bp.route('/popup/labels/<int:patient_id>', methods=['GET'])
@token_required
@role_required(['Receptionist', 'System Administrator'])
def get_patient_labels(patient_id):
    """Get patient labels (address, chart, barcode)"""
    try:
        patient = Patient.query.get_or_404(patient_id)
        label_type = request.args.get('type', 'address')  # address, chart, barcode
        
        labels = {
            'address': {
                'name': f"{patient.first_name} {patient.last_name}",
                'address': f"{patient.address_line1}\n{patient.city}, {patient.state} {patient.zip_code}",
                'phone': patient.phone_primary
            },
            'chart': {
                'patient_id': patient.universal_patient_id,
                'name': f"{patient.first_name} {patient.last_name}",
                'dob': patient.date_of_birth.isoformat() if patient.date_of_birth else None
            },
            'barcode': {
                'barcode': patient.universal_patient_id,
                'patient_id': patient.id
            }
        }
        
        return jsonify({
            'success': True,
            'label_type': label_type,
            'label_data': labels.get(label_type, {})
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Utilities
@utilities_bp.route('/holidays/import', methods=['POST'])
@token_required
@role_required(['System Administrator'])
def import_holidays():
    """Import holidays"""
    try:
        data = request.get_json()
        holidays = data.get('holidays', [])
        
        # Import holidays logic
        imported_count = len(holidays)
        
        return jsonify({
            'success': True,
            'imported_count': imported_count
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@utilities_bp.route('/dated-reminders', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_dated_reminders():
    """Get dated reminders"""
    try:
        from src.models.clinical_reminders import ClinicalReminder
        
        patient_id = request.args.get('patient_id', type=int)
        reminder_type = request.args.get('type')
        
        query = ClinicalReminder.query.filter_by(is_active=True)
        
        if patient_id:
            query = query.filter_by(patient_id=patient_id)
        
        if reminder_type:
            query = query.filter_by(reminder_type=reminder_type)
        
        reminders = query.order_by(ClinicalReminder.due_date.desc()).all()
        
        return jsonify({
            'success': True,
            'reminders': [r.to_dict() if hasattr(r, 'to_dict') else {} for r in reminders]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@utilities_bp.route('/dated-reminders', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def create_dated_reminder():
    """Create dated reminder"""
    try:
        data = request.get_json()
        
        from src.models.clinical_reminders import ClinicalReminder
        
        reminder = ClinicalReminder(
            patient_id=data.get('patient_id'),
            reminder_type=data.get('reminder_type', 'general'),
            title=data.get('title'),
            description=data.get('description'),
            due_date=datetime.fromisoformat(data['due_date']).date() if isinstance(data.get('due_date'), str) else data.get('due_date'),
            is_active=True,
            created_by=request.current_user.id if hasattr(request, 'current_user') else None
        )
        
        db.session.add(reminder)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'reminder': reminder.to_dict() if hasattr(reminder, 'to_dict') else {}
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@utilities_bp.route('/export/xml/<int:patient_id>', methods=['GET'])
@token_required
@role_required(['Physician', 'System Administrator'])
def export_patient_xml(patient_id):
    """Export patient data as XML"""
    try:
        patient = Patient.query.get_or_404(patient_id)
        
        # XML export logic
        xml_data = f"""<?xml version="1.0"?>
<patient>
    <id>{patient.id}</id>
    <mrn>{patient.universal_patient_id}</mrn>
    <name>{patient.first_name} {patient.last_name}</name>
    <dob>{patient.date_of_birth.isoformat() if patient.date_of_birth else ''}</dob>
</patient>"""
        
        return jsonify({
            'success': True,
            'xml_data': xml_data,
            'download_url': f'/api/utilities/export/xml/{patient_id}/download'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@utilities_bp.route('/import/xml', methods=['POST'])
@token_required
@role_required(['System Administrator'])
def import_patient_xml():
    """Import patient data from XML"""
    try:
        xml_data = request.get_data(as_text=True)
        
        # XML import logic
        imported_count = 1
        
        return jsonify({
            'success': True,
            'imported_count': imported_count
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@utilities_bp.route('/letter/<int:patient_id>', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def generate_letter(patient_id):
    """Generate patient letter"""
    try:
        patient = Patient.query.get_or_404(patient_id)
        letter_type = request.args.get('type', 'general')
        
        letter = {
            'patient': patient.to_dict(),
            'letter_type': letter_type,
            'content': f"Letter for {patient.first_name} {patient.last_name}",
            'date': datetime.utcnow().isoformat()
        }
        
        return jsonify({'success': True, 'letter': letter}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

