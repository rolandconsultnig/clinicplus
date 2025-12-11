"""
HL7 Lab Integration API Routes
Processes HL7 messages for lab orders and results
"""
from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.clinical import LabOrder, LabResult
from src.models.patient import Patient
from datetime import datetime
import json

try:
    from hl7apy import parser
    from hl7apy.core import Message
    HL7_AVAILABLE = True
except ImportError:
    HL7_AVAILABLE = False

labs_hl7_bp = Blueprint('labs_hl7', __name__)

@labs_hl7_bp.route('/hl7/receive', methods=['POST'])
@token_required
@role_required(['admin', 'lab'])
def receive_hl7_message():
    """Receive and process HL7 lab result message"""
    try:
        if not HL7_AVAILABLE:
            return jsonify({'error': 'HL7 library not installed. Install with: pip install hl7apy'}), 500
        
        hl7_message = request.data.decode('utf-8')
        
        # Parse HL7 message
        msg = parser.parse_message(hl7_message.replace('\n', '\r'))
        
        # Extract message type
        msh = msg.msh
        message_type = msh.message_type.mne.value if hasattr(msh.message_type, 'mne') else None
        
        if message_type == 'ORU^R01':  # Observation Result
            return process_lab_result_hl7(msg)
        elif message_type == 'ORM^O01':  # Order Message
            return process_lab_order_hl7(msg)
        else:
            return jsonify({'error': f'Unsupported message type: {message_type}'}), 400
            
    except Exception as e:
        return jsonify({'error': f'HL7 parsing error: {str(e)}'}), 500

def process_lab_result_hl7(msg):
    """Process HL7 ORU^R01 (lab result) message"""
    try:
        # Extract patient information
        pid = msg.pid
        patient_id = None
        
        # Try to find patient by MRN or other identifier
        for pid_3 in pid.pid_3:
            if pid_3.id_type.value == 'MR':
                mrn = pid_3.id_number.value
                patient = Patient.query.filter_by(universal_patient_id=mrn).first()
                if patient:
                    patient_id = patient.id
                    break
        
        if not patient_id:
            return jsonify({'error': 'Patient not found'}), 404
        
        # Extract lab order information
        orc = msg.orc if hasattr(msg, 'orc') else None
        order_id = None
        if orc and hasattr(orc, 'placer_order_number'):
            order_id = orc.placer_order_number.entity_identifier.value
        
        # Extract observation results
        obr = msg.obr if hasattr(msg, 'obr') else None
        test_name = None
        test_code = None
        
        if obr:
            if hasattr(obr, 'universal_service_id'):
                test_name = obr.universal_service_id.text.value if hasattr(obr.universal_service_id, 'text') else None
                test_code = obr.universal_service_id.identifier.value if hasattr(obr.universal_service_id, 'identifier') else None
        
        # Process OBX segments (observations)
        results_created = []
        if hasattr(msg, 'obx'):
            obx_segments = msg.obx if isinstance(msg.obx, list) else [msg.obx]
            
            for obx in obx_segments:
                if hasattr(obx, 'observation_value'):
                    result_value = obx.observation_value.value if hasattr(obx.observation_value, 'value') else None
                    result_unit = obx.units.text.value if hasattr(obx.units, 'text') else None
                    result_status = obx.observation_result_status.value if hasattr(obx, 'observation_result_status') else 'F'
                    
                    # Get test name from OBX if not in OBR
                    if hasattr(obx, 'observation_id'):
                        test_name_obx = obx.observation_id.text.value if hasattr(obx.observation_id, 'text') else test_name
                        test_code_obx = obx.observation_id.identifier.value if hasattr(obx.observation_id, 'identifier') else test_code
                    
                    # Create lab result
                    lab_result = LabResult(
                        patient_id=patient_id,
                        lab_order_id=order_id,
                        test_name=test_name_obx or test_name or 'Unknown Test',
                        test_code=test_code_obx or test_code or 'UNKNOWN',
                        result_value=str(result_value) if result_value else None,
                        result_unit=result_unit,
                        result_status=result_status,
                        result_date=datetime.utcnow(),
                        reference_range_low=None,
                        reference_range_high=None,
                        abnormal_flag='H' if result_status == 'F' else 'N',
                        notes=None
                    )
                    
                    db.session.add(lab_result)
                    results_created.append(lab_result.id)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Lab results processed successfully',
            'results_created': len(results_created),
            'result_ids': results_created
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error processing lab result: {str(e)}'}), 500

def process_lab_order_hl7(msg):
    """Process HL7 ORM^O01 (lab order) message"""
    try:
        # Extract patient information
        pid = msg.pid
        patient_id = None
        
        for pid_3 in pid.pid_3:
            if pid_3.id_type.value == 'MR':
                mrn = pid_3.id_number.value
                patient = Patient.query.filter_by(universal_patient_id=mrn).first()
                if patient:
                    patient_id = patient.id
                    break
        
        if not patient_id:
            return jsonify({'error': 'Patient not found'}), 404
        
        # Extract order information
        orc = msg.orc if hasattr(msg, 'orc') else None
        order_id = None
        if orc and hasattr(orc, 'placer_order_number'):
            order_id = orc.placer_order_number.entity_identifier.value
        
        # Extract test information from OBR
        obr = msg.obr if hasattr(msg, 'obr') else None
        test_name = None
        test_code = None
        
        if obr:
            if hasattr(obr, 'universal_service_id'):
                test_name = obr.universal_service_id.text.value if hasattr(obr.universal_service_id, 'text') else None
                test_code = obr.universal_service_id.identifier.value if hasattr(obr.universal_service_id, 'identifier') else None
        
        # Create lab order
        lab_order = LabOrder(
            patient_id=patient_id,
            order_id=order_id or f"ORD-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            test_name=test_name or 'Unknown Test',
            test_code=test_code or 'UNKNOWN',
            order_date=datetime.utcnow(),
            order_status='pending',
            ordered_by=None,
            facility_id=None,
            notes=None
        )
        
        db.session.add(lab_order)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Lab order created successfully',
            'order_id': lab_order.id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error processing lab order: {str(e)}'}), 500

@labs_hl7_bp.route('/hl7/generate-order/<int:order_id>', methods=['GET'])
@token_required
@role_required(['physician', 'nurse'])
def generate_hl7_order(order_id):
    """Generate HL7 ORM^O01 message for lab order"""
    try:
        if not HL7_AVAILABLE:
            return jsonify({'error': 'HL7 library not installed'}), 500
        
        lab_order = LabOrder.query.get_or_404(order_id)
        patient = Patient.query.get_or_404(lab_order.patient_id)
        
        # Create HL7 message
        msg = Message("ORM^O01")
        
        # MSH segment
        msg.msh.msh_3 = "ClinicPlus"
        msg.msh.msh_4 = "EHR"
        msg.msh.msh_5 = "LabNetwork"
        msg.msh.msh_6 = "Lab"
        msg.msh.msh_9 = "ORM^O01"
        msg.msh.msh_10 = str(lab_order.id)
        msg.msh.msh_11 = "P"
        msg.msh.msh_12 = "2.5"
        
        # PID segment
        msg.pid.pid_3.pid_3_1 = patient.universal_patient_id
        msg.pid.pid_3.pid_3_5 = "MR"
        msg.pid.pid_5.pid_5_1 = patient.last_name
        msg.pid.pid_5.pid_5_2 = patient.first_name
        msg.pid.pid_7 = patient.date_of_birth.strftime('%Y%m%d') if patient.date_of_birth else None
        msg.pid.pid_8 = patient.gender
        
        # ORC segment
        msg.orc.orc_1 = "NW"
        msg.orc.orc_2.placer_order_number.entity_identifier = lab_order.order_id
        
        # OBR segment
        msg.obr.obr_4.universal_service_id.identifier = lab_order.test_code
        msg.obr.obr_4.universal_service_id.text = lab_order.test_name
        
        hl7_string = msg.to_er7()
        
        return jsonify({
            'success': True,
            'hl7_message': hl7_string
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Error generating HL7: {str(e)}'}), 500

