"""
Clinic+Pad2e Emergency Response API Routes
"""
from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required
from src.models.user import db
from src.models.emergency import (
    EmergencyAccess, EmergencyDataView, HospitalHandoff, EMSDevice
)
from src.models.patient import Patient
from datetime import datetime, timedelta
import uuid

emergency_bp = Blueprint('emergency', __name__)

@emergency_bp.route('/access', methods=['POST'])
@token_required
def emergency_access():
    """Emergency access to patient data via Clinic+Pad2e"""
    try:
        data = request.get_json()
        
        # Identify patient
        identification_method = data['identification_method']
        patient = None
        
        if identification_method == 'clinic_plus_id':
            patient = Patient.query.filter(
                Patient.universal_patient_id == data['clinic_plus_id']
            ).first()
        elif identification_method == 'fingerprint':
            # Implement fingerprint matching
            from src.services.biometric_service import biometric_service
            fingerprint_data = data.get('fingerprint_data')
            if fingerprint_data:
                match_result = biometric_service.match_fingerprint(fingerprint_data)
                if match_result.get('matched'):
                    patient = Patient.query.get(match_result['patient_id'])
                else:
                    # Fallback to patient_id if provided
                    patient_id = data.get('patient_id')
                    if patient_id:
                        patient = Patient.query.get(patient_id)
            else:
                patient_id = data.get('patient_id')
                if patient_id:
                    patient = Patient.query.get(patient_id)
        elif identification_method == 'rfid':
            # Implement RFID matching
            from src.services.biometric_service import biometric_service
            rfid_tag = data.get('rfid_tag')
            if rfid_tag:
                match_result = biometric_service.match_rfid(rfid_tag)
                if match_result.get('matched'):
                    patient = Patient.query.get(match_result['patient_id'])
                else:
                    # Fallback to patient_id if provided
                    patient_id = data.get('patient_id')
                    if patient_id:
                        patient = Patient.query.get(patient_id)
            else:
                patient_id = data.get('patient_id')
                if patient_id:
                    patient = Patient.query.get(patient_id)
        
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        # Create emergency access record
        access = EmergencyAccess(
            access_id=f"EMG-{uuid.uuid4().hex[:12].upper()}",
            patient_id=patient.id,
            clinic_plus_id=patient.universal_patient_id,
            identification_method=identification_method,
            emergency_type=data.get('emergency_type'),
            incident_location=data.get('incident_location'),
            incident_latitude=data.get('incident_latitude'),
            incident_longitude=data.get('incident_longitude'),
            responder_id=request.current_user.id if request.current_user else None,
            responder_name=data.get('responder_name'),
            responder_type=data.get('responder_type', 'ems'),
            device_id=data.get('device_id'),
            accessed_at=datetime.utcnow()
        )
        
        db.session.add(access)
        db.session.flush()
        
        # Create data view record
        data_view = EmergencyDataView(
            emergency_access_id=access.id,
            patient_id=patient.id,
            blood_group=True,
            genotype=True,
            allergies=True,
            current_medications=True,
            medical_history=False,  # Only critical data for emergency
            emergency_contacts=True
        )
        
        db.session.add(data_view)
        db.session.commit()
        
        # Get critical patient data
        patient_data = {
            'patient_id': patient.id,
            'universal_patient_id': patient.universal_patient_id,
            'name': f"{patient.first_name} {patient.last_name}",
            'date_of_birth': patient.date_of_birth.isoformat() if patient.date_of_birth else None,
            'blood_group': getattr(patient, 'blood_group', None),
            'genotype': getattr(patient, 'genotype', None),
            'allergies': [a.to_dict() for a in patient.allergies] if hasattr(patient, 'allergies') else [],
            'current_medications': [],
            'emergency_contact': {
                'name': patient.emergency_contact_name,
                'phone': patient.emergency_contact_phone,
                'relationship': patient.emergency_contact_relationship
            }
        }
        
        # Get current medications
        from src.models.prescribing import Prescription
        active_prescriptions = Prescription.query.filter(
            Prescription.patient_id == patient.id,
            Prescription.status == 'active'
        ).all()
        patient_data['current_medications'] = [p.to_dict() for p in active_prescriptions]
        
        return jsonify({
            'success': True,
            'access_id': access.access_id,
            'patient_data': patient_data
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@emergency_bp.route('/handoff', methods=['POST'])
@token_required
def create_hospital_handoff():
    """Create hospital handoff for emergency patient"""
    try:
        data = request.get_json()
        
        handoff = HospitalHandoff(
            handoff_id=f"HANDOFF-{uuid.uuid4().hex[:12].upper()}",
            emergency_access_id=data['emergency_access_id'],
            patient_id=data['patient_id'],
            source_facility_id=data.get('source_facility_id'),
            destination_facility_id=data['destination_facility_id'],
            patient_condition=data.get('patient_condition'),
            vital_signs_summary=str(data.get('vital_signs', {})),
            interventions_provided=str(data.get('interventions', [])),
            medications_given=str(data.get('medications', [])),
            incident_time=datetime.fromisoformat(data['incident_time']) if data.get('incident_time') else None,
            dispatch_time=datetime.fromisoformat(data['dispatch_time']) if data.get('dispatch_time') else None,
            estimated_arrival_time=datetime.fromisoformat(data['estimated_arrival_time']),
            status='pending'
        )
        
        db.session.add(handoff)
        
        # Update emergency access
        access = EmergencyAccess.query.get(data['emergency_access_id'])
        if access:
            access.handoff_sent = True
            access.handoff_sent_at = datetime.utcnow()
            access.destination_facility_id = data['destination_facility_id']
            access.estimated_arrival_time = handoff.estimated_arrival_time
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'handoff': handoff.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@emergency_bp.route('/handoff/<int:handoff_id>/acknowledge', methods=['POST'])
@token_required
def acknowledge_handoff(handoff_id):
    """Acknowledge hospital handoff"""
    try:
        handoff = HospitalHandoff.query.get_or_404(handoff_id)
        handoff.status = 'acknowledged'
        handoff.acknowledged_at = datetime.utcnow()
        handoff.acknowledged_by = request.current_user.id
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'handoff': handoff.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@emergency_bp.route('/handoff/<int:handoff_id>/arrived', methods=['POST'])
@token_required
def mark_arrived(handoff_id):
    """Mark patient as arrived at destination"""
    try:
        handoff = HospitalHandoff.query.get_or_404(handoff_id)
        handoff.status = 'arrived'
        handoff.actual_arrival_time = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'handoff': handoff.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@emergency_bp.route('/devices', methods=['GET'])
@token_required
def get_ems_devices():
    """Get EMS devices (Clinic+Pad2e)"""
    try:
        facility_id = request.args.get('facility_id', type=int)
        is_online = request.args.get('is_online', type=bool)
        
        query = EMSDevice.query.filter(EMSDevice.is_active == True)
        
        if facility_id:
            query = query.filter(EMSDevice.facility_id == facility_id)
        if is_online is not None:
            query = query.filter(EMSDevice.is_online == is_online)
        
        devices = query.all()
        
        return jsonify({
            'success': True,
            'devices': [d.to_dict() for d in devices]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@emergency_bp.route('/devices/<int:device_id>/location', methods=['POST'])
@token_required
def update_device_location(device_id):
    """Update EMS device location"""
    try:
        device = EMSDevice.query.get_or_404(device_id)
        data = request.get_json()
        
        device.current_latitude = data.get('latitude')
        device.current_longitude = data.get('longitude')
        device.location_updated_at = datetime.utcnow()
        device.is_online = True
        device.last_seen = datetime.utcnow()
        device.battery_level = data.get('battery_level')
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'device': device.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

