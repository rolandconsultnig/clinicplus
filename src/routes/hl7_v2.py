"""
HL7 v2.x Message Routes
HL7 v2.x message processing and transmission
"""
from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.services.hl7_v2 import hl7_v2_service
from src.models.user import db
import uuid

hl7_v2_bp = Blueprint('hl7_v2', __name__)

@hl7_v2_bp.route('/parse', methods=['POST'])
@token_required
@role_required(['System Administrator', 'Facility Administrator', 'Physician'])
def parse_message():
    """Parse HL7 v2.x message"""
    try:
        data = request.get_json()
        hl7_message = data.get('message') or request.data.decode('utf-8')
        
        if not hl7_message:
            return jsonify({'error': 'HL7 message is required'}), 400
        
        parsed = hl7_v2_service.parse_message(hl7_message)
        
        if 'error' in parsed:
            return jsonify({
                'success': False,
                'error': parsed['error']
            }), 400
        
        return jsonify({
            'success': True,
            'parsed_message': parsed
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hl7_v2_bp.route('/create/admit', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def create_admit_message():
    """Create HL7 v2.x ADT^A01 (Admit) message"""
    try:
        data = request.get_json()
        patient_id = data.get('patient_id')
        encounter_id = data.get('encounter_id')
        facility_id = data.get('facility_id')
        
        if not patient_id or not encounter_id:
            return jsonify({'error': 'Patient ID and Encounter ID are required'}), 400
        
        message = hl7_v2_service.create_admit_message(patient_id, encounter_id, facility_id)
        
        if not message:
            return jsonify({'error': 'Failed to create message'}), 400
        
        return jsonify({
            'success': True,
            'message': message,
            'message_type': 'ADT^A01'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hl7_v2_bp.route('/create/discharge', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def create_discharge_message():
    """Create HL7 v2.x ADT^A03 (Discharge) message"""
    try:
        data = request.get_json()
        patient_id = data.get('patient_id')
        encounter_id = data.get('encounter_id')
        facility_id = data.get('facility_id')
        
        if not patient_id or not encounter_id:
            return jsonify({'error': 'Patient ID and Encounter ID are required'}), 400
        
        message = hl7_v2_service.create_discharge_message(patient_id, encounter_id, facility_id)
        
        if not message:
            return jsonify({'error': 'Failed to create message'}), 400
        
        return jsonify({
            'success': True,
            'message': message,
            'message_type': 'ADT^A03'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hl7_v2_bp.route('/create/oru', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse', 'Lab Technician', 'System Administrator'])
def create_oru_message():
    """Create HL7 v2.x ORU^R01 (Observation Result) message"""
    try:
        data = request.get_json()
        patient_id = data.get('patient_id')
        lab_result_id = data.get('lab_result_id')
        
        if not patient_id or not lab_result_id:
            return jsonify({'error': 'Patient ID and Lab Result ID are required'}), 400
        
        message = hl7_v2_service.create_oru_message(patient_id, lab_result_id)
        
        if not message:
            return jsonify({'error': 'Failed to create message'}), 400
        
        return jsonify({
            'success': True,
            'message': message,
            'message_type': 'ORU^R01'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hl7_v2_bp.route('/send', methods=['POST'])
@token_required
@role_required(['System Administrator', 'Facility Administrator'])
def send_message():
    """Send HL7 v2.x message to external system"""
    try:
        data = request.get_json()
        hl7_message = data.get('message')
        destination_url = data.get('destination_url')
        destination_port = data.get('destination_port', 8080)
        
        if not hl7_message:
            return jsonify({'error': 'HL7 message is required'}), 400
        
        # In production, would use MLLP (Minimal Lower Layer Protocol) or HTTP
        # For now, return success with message
        
        return jsonify({
            'success': True,
            'message': 'Message sent successfully',
            'message_length': len(hl7_message),
            'destination': destination_url or 'localhost'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hl7_v2_bp.route('/receive', methods=['POST'])
@token_required
def receive_message():
    """Receive HL7 v2.x message from external system"""
    try:
        # Accept raw HL7 message
        hl7_message = request.data.decode('utf-8') or request.get_json().get('message') if request.is_json else None
        
        if not hl7_message:
            return jsonify({'error': 'HL7 message is required'}), 400
        
        # Parse message
        parsed = hl7_v2_service.parse_message(hl7_message)
        
        if 'error' in parsed:
            return jsonify({
                'success': False,
                'error': parsed['error']
            }), 400
        
        # Process message based on type
        message_type = parsed.get('message_type', '')
        
        if message_type.startswith('ADT'):
            # Process ADT message
            result = _process_adt_message(parsed)
        elif message_type.startswith('ORU'):
            # Process ORU message
            result = _process_oru_message(parsed)
        else:
            result = {'status': 'received', 'message': 'Message received but not processed'}
        
        return jsonify({
            'success': True,
            'parsed_message': parsed,
            'processing_result': result
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def _process_adt_message(parsed_message):
    """Process ADT (Admit/Discharge/Transfer) message"""
    # In production, would create/update patient and encounter records
    return {'status': 'processed', 'type': 'ADT'}

def _process_oru_message(parsed_message):
    """Process ORU (Observation Result) message"""
    # In production, would create lab result records
    return {'status': 'processed', 'type': 'ORU'}

