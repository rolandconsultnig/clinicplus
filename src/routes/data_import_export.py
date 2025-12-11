"""
Data Import/Export API Routes
Handles data migration, import, and export in various formats
"""
from flask import Blueprint, request, jsonify, send_file
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.patient import Patient, MedicalHistory, Allergy, Medication
from src.models.clinical import ClinicalEncounter, LabResult
from datetime import datetime
import json
import csv
import io

data_import_export_bp = Blueprint('data_import_export', __name__)

@data_import_export_bp.route('/export/patients', methods=['GET'])
@token_required
@role_required(['admin'])
def export_patients():
    """Export patients to CSV"""
    try:
        format_type = request.args.get('format', 'csv')  # csv, json
        
        patients = Patient.query.all()
        
        if format_type == 'json':
            data = {
                'export_date': datetime.utcnow().isoformat(),
                'total_patients': len(patients),
                'patients': [p.to_dict() for p in patients]
            }
            return jsonify(data), 200
        
        # CSV export
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow([
            'ID', 'Universal Patient ID', 'First Name', 'Last Name', 'Date of Birth',
            'Gender', 'Email', 'Phone', 'Address', 'City', 'State', 'Zip Code'
        ])
        
        # Data rows
        for patient in patients:
            writer.writerow([
                patient.id,
                patient.universal_patient_id,
                patient.first_name,
                patient.last_name,
                patient.date_of_birth.isoformat() if patient.date_of_birth else '',
                patient.gender or '',
                patient.email or '',
                patient.phone_primary or '',
                patient.address_line1 or '',
                patient.city or '',
                patient.state or '',
                patient.zip_code or ''
            ])
        
        output.seek(0)
        return send_file(
            io.BytesIO(output.getvalue().encode('utf-8')),
            mimetype='text/csv',
            as_attachment=True,
            download_name=f'patients_export_{datetime.utcnow().strftime("%Y%m%d")}.csv'
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@data_import_export_bp.route('/export/encounters', methods=['GET'])
@token_required
@role_required(['admin', 'physician'])
def export_encounters():
    """Export clinical encounters"""
    try:
        patient_id = request.args.get('patient_id', type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        format_type = request.args.get('format', 'json')
        
        query = ClinicalEncounter.query
        
        if patient_id:
            query = query.filter(ClinicalEncounter.patient_id == patient_id)
        if start_date:
            query = query.filter(ClinicalEncounter.encounter_date >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(ClinicalEncounter.encounter_date <= datetime.fromisoformat(end_date))
        
        encounters = query.all()
        
        if format_type == 'csv':
            output = io.StringIO()
            writer = csv.writer(output)
            
            writer.writerow([
                'Encounter ID', 'Patient ID', 'Provider ID', 'Facility ID',
                'Encounter Type', 'Encounter Date', 'Status', 'Chief Complaint'
            ])
            
            for enc in encounters:
                writer.writerow([
                    enc.encounter_id,
                    enc.patient_id,
                    enc.provider_id,
                    enc.facility_id,
                    enc.encounter_type,
                    enc.encounter_date.isoformat() if enc.encounter_date else '',
                    enc.encounter_status,
                    enc.chief_complaint or ''
                ])
            
            output.seek(0)
            return send_file(
                io.BytesIO(output.getvalue().encode('utf-8')),
                mimetype='text/csv',
                as_attachment=True,
                download_name=f'encounters_export_{datetime.utcnow().strftime("%Y%m%d")}.csv'
            )
        
        return jsonify({
            'export_date': datetime.utcnow().isoformat(),
            'total_encounters': len(encounters),
            'encounters': [enc.to_dict() for enc in encounters]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@data_import_export_bp.route('/import/patients', methods=['POST'])
@token_required
@role_required(['admin'])
def import_patients():
    """Import patients from CSV or JSON"""
    try:
        format_type = request.content_type
        
        if 'json' in format_type:
            data = request.get_json()
            patients_data = data.get('patients', [])
        elif 'csv' in format_type or 'text/csv' in format_type:
            csv_data = request.data.decode('utf-8')
            csv_reader = csv.DictReader(io.StringIO(csv_data))
            patients_data = list(csv_reader)
        else:
            return jsonify({'error': 'Unsupported format. Use JSON or CSV'}), 400
        
        imported = []
        errors = []
        
        for idx, patient_data in enumerate(patients_data):
            try:
                # Create patient
                patient = Patient(
                    universal_patient_id=patient_data.get('universal_patient_id') or f"PAT-{datetime.utcnow().timestamp()}-{idx}",
                    first_name=patient_data.get('first_name', ''),
                    last_name=patient_data.get('last_name', ''),
                    date_of_birth=datetime.fromisoformat(patient_data['date_of_birth']).date() if patient_data.get('date_of_birth') else None,
                    gender=patient_data.get('gender'),
                    email=patient_data.get('email'),
                    phone_primary=patient_data.get('phone') or patient_data.get('phone_primary'),
                    address_line1=patient_data.get('address') or patient_data.get('address_line1'),
                    city=patient_data.get('city'),
                    state=patient_data.get('state'),
                    zip_code=patient_data.get('zip_code') or patient_data.get('zip'),
                    country=patient_data.get('country', 'USA')
                )
                
                db.session.add(patient)
                imported.append(patient.universal_patient_id)
                
            except Exception as e:
                errors.append(f"Row {idx + 1}: {str(e)}")
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'imported': len(imported),
            'errors': errors,
            'imported_ids': imported
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@data_import_export_bp.route('/import/hl7', methods=['POST'])
@token_required
@role_required(['admin', 'lab'])
def import_hl7():
    """Import data from HL7 message"""
    try:
        # Redirect to HL7 lab processing
        from src.routes.labs_hl7 import receive_hl7_message
        return receive_hl7_message()
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@data_import_export_bp.route('/export/fhir-bundle', methods=['GET'])
@token_required
@role_required(['admin', 'physician'])
def export_fhir_bundle():
    """Export patient data as FHIR Bundle"""
    try:
        patient_id = request.args.get('patient_id', type=int)
        
        if not patient_id:
            return jsonify({'error': 'patient_id required'}), 400
        
        patient = Patient.query.get_or_404(patient_id)
        
        # Get related resources
        encounters = ClinicalEncounter.query.filter_by(patient_id=patient_id).all()
        medications = Medication.query.filter_by(patient_id=patient_id).all()
        allergies = Allergy.query.filter_by(patient_id=patient_id).all()
        lab_results = LabResult.query.filter_by(patient_id=patient_id).all()
        
        # Build FHIR Bundle
        bundle = {
            'resourceType': 'Bundle',
            'type': 'collection',
            'entry': []
        }
        
        # Add Patient resource
        bundle['entry'].append({
            'resource': {
                'resourceType': 'Patient',
                'id': str(patient.id),
                'identifier': [{
                    'system': 'http://clinicplus.com/patient-id',
                    'value': patient.universal_patient_id
                }],
                'name': [{
                    'family': patient.last_name,
                    'given': [patient.first_name]
                }],
                'gender': patient.gender,
                'birthDate': patient.date_of_birth.isoformat() if patient.date_of_birth else None
            }
        })
        
        # Add Encounters
        for enc in encounters:
            bundle['entry'].append({
                'resource': {
                    'resourceType': 'Encounter',
                    'id': str(enc.id),
                    'status': 'finished',
                    'subject': {'reference': f'Patient/{patient_id}'},
                    'period': {
                        'start': enc.encounter_date.isoformat() if enc.encounter_date else None
                    }
                }
            })
        
        # Add Medications
        for med in medications:
            bundle['entry'].append({
                'resource': {
                    'resourceType': 'MedicationStatement',
                    'id': str(med.id),
                    'status': 'active' if med.is_active else 'stopped',
                    'subject': {'reference': f'Patient/{patient_id}'},
                    'medicationCodeableConcept': {
                        'text': med.medication_name
                    }
                }
            })
        
        return jsonify(bundle), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

