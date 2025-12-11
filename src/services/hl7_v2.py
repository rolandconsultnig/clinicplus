"""
HL7 v2.x Message Processing Service
Supports HL7 v2.x message parsing, generation, and transmission
"""
from datetime import datetime
import re

class HL7v2Service:
    """HL7 v2.x Message Service"""
    
    # HL7 v2.x Segment Separators
    SEGMENT_SEPARATOR = '\r'
    FIELD_SEPARATOR = '|'
    COMPONENT_SEPARATOR = '^'
    REPETITION_SEPARATOR = '~'
    ESCAPE_CHARACTER = '\\'
    SUBCOMPONENT_SEPARATOR = '&'
    
    def parse_message(self, hl7_message):
        """
        Parse HL7 v2.x message
        
        Args:
            hl7_message: Raw HL7 v2.x message string
        
        Returns:
            Parsed message dictionary
        """
        try:
            lines = hl7_message.strip().split(self.SEGMENT_SEPARATOR)
            
            message = {
                'message_type': None,
                'message_control_id': None,
                'segments': []
            }
            
            for line in lines:
                if not line.strip():
                    continue
                
                segment = self._parse_segment(line)
                message['segments'].append(segment)
                
                # Extract MSH segment info
                if segment['segment_type'] == 'MSH':
                    message['message_type'] = segment['fields'].get('message_type', '')
                    message['message_control_id'] = segment['fields'].get('message_control_id', '')
            
            return message
            
        except Exception as e:
            return {'error': str(e)}
    
    def _parse_segment(self, segment_line):
        """Parse a single HL7 segment"""
        fields = segment_line.split(self.FIELD_SEPARATOR)
        
        segment_type = fields[0] if fields else ''
        
        parsed_segment = {
            'segment_type': segment_type,
            'fields': {}
        }
        
        # Parse fields based on segment type
        if segment_type == 'MSH':
            parsed_segment['fields'] = {
                'field_separator': fields[1] if len(fields) > 1 else '|',
                'encoding_characters': fields[2] if len(fields) > 2 else '',
                'sending_application': fields[3] if len(fields) > 3 else '',
                'sending_facility': fields[4] if len(fields) > 4 else '',
                'receiving_application': fields[5] if len(fields) > 5 else '',
                'receiving_facility': fields[6] if len(fields) > 6 else '',
                'date_time': fields[7] if len(fields) > 7 else '',
                'security': fields[8] if len(fields) > 8 else '',
                'message_type': fields[9] if len(fields) > 9 else '',
                'message_control_id': fields[10] if len(fields) > 10 else '',
                'processing_id': fields[11] if len(fields) > 11 else '',
                'version_id': fields[12] if len(fields) > 12 else '2.5'
            }
        elif segment_type == 'PID':
            parsed_segment['fields'] = {
                'set_id': fields[1] if len(fields) > 1 else '',
                'patient_id': fields[2] if len(fields) > 2 else '',
                'patient_identifier_list': fields[3] if len(fields) > 3 else '',
                'patient_name': fields[5] if len(fields) > 5 else '',
                'date_of_birth': fields[7] if len(fields) > 7 else '',
                'sex': fields[8] if len(fields) > 8 else '',
                'patient_address': fields[11] if len(fields) > 11 else '',
                'phone_number': fields[13] if len(fields) > 13 else ''
            }
        elif segment_type == 'PV1':
            parsed_segment['fields'] = {
                'set_id': fields[1] if len(fields) > 1 else '',
                'patient_class': fields[2] if len(fields) > 2 else '',
                'assigned_patient_location': fields[3] if len(fields) > 3 else '',
                'admission_type': fields[4] if len(fields) > 4 else '',
                'admit_date': fields[44] if len(fields) > 44 else ''
            }
        elif segment_type == 'OBX':
            parsed_segment['fields'] = {
                'set_id': fields[1] if len(fields) > 1 else '',
                'value_type': fields[2] if len(fields) > 2 else '',
                'observation_id': fields[3] if len(fields) > 3 else '',
                'observation_value': fields[5] if len(fields) > 5 else '',
                'units': fields[6] if len(fields) > 6 else '',
                'reference_range': fields[7] if len(fields) > 7 else '',
                'observation_date': fields[14] if len(fields) > 14 else ''
            }
        else:
            # Generic field parsing
            parsed_segment['fields'] = {f'field_{i}': fields[i] if i < len(fields) else '' for i in range(1, len(fields))}
        
        return parsed_segment
    
    def create_admit_message(self, patient_id, encounter_id, facility_id):
        """Create HL7 v2.x ADT^A01 (Admit) message"""
        try:
            from src.models.patient import Patient
            from src.models.clinical import ClinicalEncounter
            from src.models.provider import Facility
            
            patient = Patient.query.get(patient_id)
            encounter = ClinicalEncounter.query.get(encounter_id)
            facility = Facility.query.get(facility_id)
            
            if not patient or not encounter:
                return None
            
            # Generate message control ID
            control_id = f"ADT{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            # MSH Segment
            msh = self._create_msh_segment(
                message_type='ADT^A01',
                message_control_id=control_id,
                sending_application='ClinicPlus',
                sending_facility=facility.facility_name if facility else 'ClinicPlus',
                receiving_application='HIS',
                receiving_facility='Hospital'
            )
            
            # EVN Segment
            evn = self._create_evn_segment(
                event_type='A01',
                event_date_time=encounter.encounter_date.strftime('%Y%m%d%H%M%S') if encounter.encounter_date else datetime.now().strftime('%Y%m%d%H%M%S')
            )
            
            # PID Segment
            pid = self._create_pid_segment(patient)
            
            # PV1 Segment
            pv1 = self._create_pv1_segment(encounter)
            
            # Build message
            message = f"{msh}{self.SEGMENT_SEPARATOR}{evn}{self.SEGMENT_SEPARATOR}{pid}{self.SEGMENT_SEPARATOR}{pv1}{self.SEGMENT_SEPARATOR}"
            
            return message
            
        except Exception as e:
            return None
    
    def create_discharge_message(self, patient_id, encounter_id, facility_id):
        """Create HL7 v2.x ADT^A03 (Discharge) message"""
        try:
            from src.models.patient import Patient
            from src.models.clinical import ClinicalEncounter
            from src.models.provider import Facility
            
            patient = Patient.query.get(patient_id)
            encounter = ClinicalEncounter.query.get(encounter_id)
            facility = Facility.query.get(facility_id)
            
            if not patient or not encounter:
                return None
            
            control_id = f"ADT{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            msh = self._create_msh_segment(
                message_type='ADT^A03',
                message_control_id=control_id,
                sending_application='ClinicPlus',
                sending_facility=facility.facility_name if facility else 'ClinicPlus'
            )
            
            evn = self._create_evn_segment('A03', datetime.now().strftime('%Y%m%d%H%M%S'))
            pid = self._create_pid_segment(patient)
            pv1 = self._create_pv1_segment(encounter)
            
            message = f"{msh}{self.SEGMENT_SEPARATOR}{evn}{self.SEGMENT_SEPARATOR}{pid}{self.SEGMENT_SEPARATOR}{pv1}{self.SEGMENT_SEPARATOR}"
            
            return message
            
        except Exception as e:
            return None
    
    def create_oru_message(self, patient_id, lab_result_id):
        """Create HL7 v2.x ORU^R01 (Observation Result) message"""
        try:
            from src.models.patient import Patient
            from src.models.clinical import LabResult
            
            patient = Patient.query.get(patient_id)
            lab_result = LabResult.query.get(lab_result_id)
            
            if not patient or not lab_result:
                return None
            
            control_id = f"ORU{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            msh = self._create_msh_segment(
                message_type='ORU^R01',
                message_control_id=control_id,
                sending_application='ClinicPlus',
                sending_facility='ClinicPlus'
            )
            
            pid = self._create_pid_segment(patient)
            
            # OBR Segment (Observation Request)
            obr = f"OBR|1||{lab_result.test_code}^{lab_result.test_name}|||||{lab_result.order_date.strftime('%Y%m%d%H%M%S') if lab_result.order_date else ''}|||||||||||||||"
            
            # OBX Segment (Observation Result)
            obx = f"OBX|1|{lab_result.result_value_type or 'NM'}|{lab_result.test_code}^{lab_result.test_name}||{lab_result.result_value}|{lab_result.result_unit}|||||F|||{lab_result.result_date.strftime('%Y%m%d%H%M%S') if lab_result.result_date else ''}"
            
            message = f"{msh}{self.SEGMENT_SEPARATOR}{pid}{self.SEGMENT_SEPARATOR}{obr}{self.SEGMENT_SEPARATOR}{obx}{self.SEGMENT_SEPARATOR}"
            
            return message
            
        except Exception as e:
            return None
    
    def _create_msh_segment(self, message_type, message_control_id, sending_application='ClinicPlus',
                           sending_facility='ClinicPlus', receiving_application='', receiving_facility=''):
        """Create MSH (Message Header) segment"""
        now = datetime.now().strftime('%Y%m%d%H%M%S')
        return f"MSH|^~\\&|{sending_application}|{sending_facility}|{receiving_application}|{receiving_facility}|{now}||{message_type}|{message_control_id}|P|2.5"
    
    def _create_evn_segment(self, event_type, event_date_time):
        """Create EVN (Event Type) segment"""
        return f"EVN|{event_type}||{event_date_time}||||"
    
    def _create_pid_segment(self, patient):
        """Create PID (Patient Identification) segment"""
        patient_name = f"{patient.last_name}^{patient.first_name}"
        dob = patient.date_of_birth.strftime('%Y%m%d') if patient.date_of_birth else ''
        address = f"{patient.address_line1 or ''}^{patient.city or ''}^{patient.state or ''}^{patient.zip_code or ''}"
        phone = patient.phone_primary or ''
        
        return f"PID|1||{patient.universal_patient_id}||{patient_name}||{dob}|{patient.gender or 'U'}|||{address}||{phone}||||||||||||||||"
    
    def _create_pv1_segment(self, encounter):
        """Create PV1 (Patient Visit) segment"""
        admit_date = encounter.encounter_date.strftime('%Y%m%d%H%M%S') if encounter.encounter_date else datetime.now().strftime('%Y%m%d%H%M%S')
        patient_class = 'I' if encounter.encounter_type == 'inpatient' else 'O'
        
        return f"PV1|1|{patient_class}||||||||||||||||||||||||||||||||||||||||||{admit_date}"

# Global instance
hl7_v2_service = HL7v2Service()

