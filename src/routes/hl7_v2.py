"""
HL7 v2.x Message Routes
HL7 v2.x message processing and transmission
"""
from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.services.hl7_v2 import hl7_v2_service
from src.models.user import db
from src.models.clinical import ClinicalEncounter, LabResult, LabOrder
from src.models.patient import Patient
from src.models.interoperability import HL7MessageLog
import uuid
import json
from datetime import datetime

hl7_v2_bp = Blueprint('hl7_v2', __name__)
_hl7_tables_ready = False


def _ensure_hl7_tables():
    global _hl7_tables_ready
    if _hl7_tables_ready:
        return
    HL7MessageLog.__table__.create(bind=db.engine, checkfirst=True)
    _hl7_tables_ready = True


@hl7_v2_bp.before_request
def initialize_hl7_tables():
    _ensure_hl7_tables()

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
        
        parsed = hl7_v2_service.parse_message(hl7_message)
        message_log = HL7MessageLog(
            direction='outbound',
            message_type=parsed.get('message_type'),
            message_control_id=parsed.get('message_control_id'),
            source_system='ClinicPlus',
            destination_system=destination_url or 'localhost',
            destination_url=destination_url,
            destination_port=int(destination_port) if destination_port else None,
            status='queued',
            payload=hl7_message,
            parsed_json=json.dumps(parsed),
            processing_result_json=json.dumps({'transport': 'internal_log_only'}),
            created_by=getattr(request.current_user, 'id', None),
        )
        db.session.add(message_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Message sent successfully',
            'message_length': len(hl7_message),
            'destination': destination_url or 'localhost',
            'log_id': message_log.id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@hl7_v2_bp.route('/receive', methods=['POST'])
@token_required
def receive_message():
    """Receive HL7 v2.x message from external system"""
    try:
        # Accept raw HL7 message
        hl7_message = request.data.decode('utf-8') if request.data else None
        if request.is_json:
            body = request.get_json(silent=True) or {}
            hl7_message = body.get('message') or hl7_message
        
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
        
        message_log = HL7MessageLog(
            direction='inbound',
            message_type=parsed.get('message_type'),
            message_control_id=parsed.get('message_control_id'),
            source_system='external',
            destination_system='ClinicPlus',
            status='processed',
            payload=hl7_message,
            parsed_json=json.dumps(parsed),
            processing_result_json=json.dumps(result),
            created_by=getattr(request.current_user, 'id', None),
        )
        db.session.add(message_log)
        db.session.commit()

        return jsonify({
            'success': True,
            'parsed_message': parsed,
            'processing_result': result,
            'log_id': message_log.id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

def _process_adt_message(parsed_message):
    """Process ADT (Admit/Discharge/Transfer) message"""
    pid = next((s for s in parsed_message.get('segments', []) if s.get('segment_type') == 'PID'), {})
    pv1 = next((s for s in parsed_message.get('segments', []) if s.get('segment_type') == 'PV1'), {})
    msh = next((s for s in parsed_message.get('segments', []) if s.get('segment_type') == 'MSH'), {})
    msg_type = (msh.get('fields', {}).get('message_type') or '')
    pid_fields = pid.get('fields', {})
    pv1_fields = pv1.get('fields', {})

    universal_id = pid_fields.get('patient_identifier_list') or pid_fields.get('patient_id')
    patient = Patient.query.filter_by(universal_patient_id=universal_id).first() if universal_id else None
    if patient and msg_type.endswith('A03'):
        latest = ClinicalEncounter.query.filter_by(patient_id=patient.id).order_by(ClinicalEncounter.encounter_date.desc()).first()
        if latest and latest.encounter_status != 'completed':
            latest.encounter_status = 'completed'
            latest.updated_at = datetime.utcnow()
            db.session.flush()
            return {'status': 'processed', 'type': 'ADT', 'action': 'encounter_completed', 'encounter_id': latest.id}
    return {'status': 'processed', 'type': 'ADT', 'action': 'no_matching_patient'}

def _process_oru_message(parsed_message):
    """Process ORU (Observation Result) message"""
    pid = next((s for s in parsed_message.get('segments', []) if s.get('segment_type') == 'PID'), {})
    obx = next((s for s in parsed_message.get('segments', []) if s.get('segment_type') == 'OBX'), {})
    pid_fields = pid.get('fields', {})
    obx_fields = obx.get('fields', {})

    universal_id = pid_fields.get('patient_identifier_list') or pid_fields.get('patient_id')
    patient = Patient.query.filter_by(universal_patient_id=universal_id).first() if universal_id else None
    if not patient:
        return {'status': 'processed', 'type': 'ORU', 'action': 'no_matching_patient'}

    test_composite = obx_fields.get('observation_id', '')
    test_name = test_composite.split('^')[1] if '^' in test_composite else test_composite or 'External Observation'
    test_code = test_composite.split('^')[0] if '^' in test_composite else None
    encounter = ClinicalEncounter.query.filter_by(patient_id=patient.id).order_by(ClinicalEncounter.encounter_date.desc()).first()
    if encounter:
        order = LabOrder(
            order_id=f'HL7-ORD-{uuid.uuid4().hex[:10].upper()}',
            encounter_id=encounter.id,
            patient_id=patient.id,
            ordering_provider_id=encounter.provider_id,
            facility_id=encounter.facility_id,
            test_name=test_name,
            test_code=test_code,
            test_category='laboratory',
            status='completed',
            order_date=datetime.utcnow(),
            priority='routine',
            specimen_type='External',
            clinical_indication='Imported via HL7 ORU',
        )
        db.session.add(order)
        db.session.flush()
        lab_order_id = order.id
    else:
        # cannot persist result without a valid encounter-backed order
        return {'status': 'processed', 'type': 'ORU', 'action': 'no_matching_encounter'}

    result = LabResult(
        result_id=f'HL7-{uuid.uuid4().hex[:12].upper()}',
        order_id=None,
        lab_order_id=lab_order_id,
        patient_id=patient.id,
        test_name=test_name,
        result_value=obx_fields.get('observation_value'),
        result_unit=obx_fields.get('units'),
        reference_range=obx_fields.get('reference_range'),
        status='normal',
        result_status='final',
        performing_lab='External HL7 Feed',
    )
    # best effort if optional attributes are present
    if hasattr(result, 'test_code'):
        setattr(result, 'test_code', test_code)
    db.session.add(result)
    db.session.flush()
    return {'status': 'processed', 'type': 'ORU', 'action': 'lab_result_created', 'lab_result_id': result.id}

