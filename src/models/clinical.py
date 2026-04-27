"""
Clinical Encounter and Related Models
"""
from datetime import datetime
import json
from src.models.user import db

class ClinicalEncounter(db.Model):
    __tablename__ = 'clinical_encounters'
    
    id = db.Column(db.Integer, primary_key=True)
    encounter_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Patient and Provider Information
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=False)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    
    # Encounter Details
    encounter_type = db.Column(db.String(50), nullable=False)  # office_visit, emergency, inpatient, telemedicine
    encounter_date = db.Column(db.DateTime, nullable=False)
    encounter_status = db.Column(db.String(50), default='scheduled')  # scheduled, in_progress, completed, cancelled
    
    # Clinical Information
    chief_complaint = db.Column(db.Text)
    history_present_illness = db.Column(db.Text)
    assessment = db.Column(db.Text)
    plan = db.Column(db.Text)
    diagnosis = db.Column(db.Text)  # Alias for assessment
    treatment_plan = db.Column(db.Text)  # Alias for plan
    notes = db.Column(db.Text)
    
    # Follow-up
    follow_up_required = db.Column(db.Boolean, default=False)
    follow_up_date = db.Column(db.Date)
    
    # Visit Details
    duration_minutes = db.Column(db.Integer)
    visit_reason = db.Column(db.String(200))
    
    # Billing Information
    billing_codes = db.Column(db.Text)  # JSON string for CPT codes
    diagnosis_codes = db.Column(db.Text)  # JSON string for ICD-10 codes
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    vital_signs = db.relationship('VitalSigns', backref='encounter', lazy=True)
    clinical_notes = db.relationship('ClinicalNote', backref='encounter', lazy=True)
    lab_orders = db.relationship('LabOrder', backref='encounter', lazy=True)
    
    def __repr__(self):
        return f'<ClinicalEncounter {self.encounter_id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'encounter_id': self.encounter_id,
            'patient_id': self.patient_id,
            'provider_id': self.provider_id,
            'facility_id': self.facility_id,
            'encounter_type': self.encounter_type,
            'encounter_date': self.encounter_date.isoformat() if self.encounter_date else None,
            'encounter_status': self.encounter_status,
            'chief_complaint': self.chief_complaint,
            'assessment': self.assessment or self.diagnosis,
            'diagnosis': self.diagnosis or self.assessment,
            'plan': self.plan or self.treatment_plan,
            'treatment_plan': self.treatment_plan or self.plan,
            'notes': self.notes,
            'follow_up_required': self.follow_up_required,
            'follow_up_date': self.follow_up_date.isoformat() if self.follow_up_date else None,
            'duration_minutes': self.duration_minutes,
            'visit_reason': self.visit_reason,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class VitalSigns(db.Model):
    __tablename__ = 'vital_signs'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    encounter_id = db.Column(db.Integer, db.ForeignKey('clinical_encounters.id'), nullable=True)
    
    # Vital Signs Measurements
    systolic_bp = db.Column(db.Integer)  # mmHg
    diastolic_bp = db.Column(db.Integer)  # mmHg
    heart_rate = db.Column(db.Integer)  # bpm
    respiratory_rate = db.Column(db.Integer)  # breaths per minute
    temperature = db.Column(db.Float)  # Fahrenheit
    oxygen_saturation = db.Column(db.Float)  # percentage
    
    # Physical Measurements
    height = db.Column(db.Float)  # inches
    height_inches = db.Column(db.Float)  # Alias
    weight = db.Column(db.Float)  # pounds
    weight_pounds = db.Column(db.Float)  # Alias
    bmi = db.Column(db.Float)
    
    # Pain Assessment
    pain_scale = db.Column(db.Integer)  # 0-10 scale
    
    # Measurement Details
    measured_by = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=True)
    recorded_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    measurement_time = db.Column(db.DateTime, default=datetime.utcnow)
    recorded_at = db.Column(db.DateTime, default=datetime.utcnow)  # Alias
    notes = db.Column(db.Text)
    
    def to_dict(self):
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'encounter_id': self.encounter_id,
            'systolic_bp': self.systolic_bp,
            'diastolic_bp': self.diastolic_bp,
            'heart_rate': self.heart_rate,
            'respiratory_rate': self.respiratory_rate,
            'temperature': self.temperature,
            'oxygen_saturation': self.oxygen_saturation,
            'height': self.height or self.height_inches,
            'height_inches': self.height_inches or self.height,
            'weight': self.weight or self.weight_pounds,
            'weight_pounds': self.weight_pounds or self.weight,
            'bmi': self.bmi,
            'pain_scale': self.pain_scale,
            'recorded_by': self.recorded_by,
            'recorded_at': (self.recorded_at or self.measurement_time).isoformat() if (self.recorded_at or self.measurement_time) else None,
            'measurement_time': (self.measurement_time or self.recorded_at).isoformat() if (self.measurement_time or self.recorded_at) else None,
            'notes': self.notes
        }

class ClinicalNote(db.Model):
    __tablename__ = 'clinical_notes'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    encounter_id = db.Column(db.Integer, db.ForeignKey('clinical_encounters.id'), nullable=True)
    
    # Note Information
    note_type = db.Column(db.String(50), nullable=False, default='progress')  # progress_note, discharge_summary, consultation, etc.
    note_title = db.Column(db.String(200))
    note_content = db.Column(db.Text, nullable=False)
    content = db.Column(db.Text)  # Alias for note_content
    
    # Authoring Information
    author_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Version Control
    version = db.Column(db.Integer, default=1)
    is_current_version = db.Column(db.Boolean, default=True)
    
    # Status
    status = db.Column(db.String(50), default='draft')  # draft, final, amended
    signed_at = db.Column(db.DateTime)
    signed_by = db.Column(db.Integer, db.ForeignKey('providers.id'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'encounter_id': self.encounter_id,
            'note_type': self.note_type,
            'note_title': self.note_title,
            'note_content': self.note_content or self.content,
            'content': self.content or self.note_content,
            'author_id': self.author_id,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'version': self.version,
            'status': self.status,
            'signed_at': self.signed_at.isoformat() if self.signed_at else None
        }

class LabOrder(db.Model):
    __tablename__ = 'lab_orders'
    
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Order Information
    encounter_id = db.Column(db.Integer, db.ForeignKey('clinical_encounters.id'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    ordering_provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=False)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=True)
    
    # Test Information
    test_name = db.Column(db.String(200), nullable=False)
    test_code = db.Column(db.String(50))  # LOINC code
    test_category = db.Column(db.String(100))  # chemistry, hematology, microbiology, etc.
    
    # Order Details
    order_date = db.Column(db.DateTime, default=datetime.utcnow)
    priority = db.Column(db.String(20), default='routine')  # routine, urgent, stat
    clinical_indication = db.Column(db.Text)
    
    # Status
    status = db.Column(db.String(50), default='pending')  # pending, in_progress, completed, cancelled
    order_status = db.Column(db.String(50), default='ordered')  # Alias
    completed_date = db.Column(db.Date)
    
    # Collection Information
    collection_date = db.Column(db.DateTime)
    collection_method = db.Column(db.String(100))
    specimen_type = db.Column(db.String(100))
    
    # Relationships
    lab_results = db.relationship('LabResult', backref='lab_order', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'order_id': self.order_id,
            'encounter_id': self.encounter_id,
            'patient_id': self.patient_id,
            'facility_id': self.facility_id,
            'test_name': self.test_name,
            'test_code': self.test_code,
            'test_category': self.test_category,
            'order_date': self.order_date.isoformat() if self.order_date else None,
            'priority': self.priority,
            'clinical_indication': self.clinical_indication,
            'status': self.status or self.order_status,
            'order_status': self.order_status or self.status,
            'completed_date': self.completed_date.isoformat() if self.completed_date else None,
            'collection_date': self.collection_date.isoformat() if self.collection_date else None,
            'specimen_type': self.specimen_type
        }

class LabResult(db.Model):
    __tablename__ = 'lab_results'
    
    id = db.Column(db.Integer, primary_key=True)
    result_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    order_id = db.Column(db.String(50))  # String reference
    
    # Result Information
    lab_order_id = db.Column(db.Integer, db.ForeignKey('lab_orders.id'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    
    # Test Results
    test_name = db.Column(db.String(200), nullable=False)
    result_value = db.Column(db.String(100))
    result_unit = db.Column(db.String(50))
    units = db.Column(db.String(50))  # Alias
    reference_range = db.Column(db.String(100))
    abnormal_flag = db.Column(db.String(20))  # normal, high, low, critical
    status = db.Column(db.String(20), default='normal')  # normal, abnormal, critical
    
    # Result Details
    result_date = db.Column(db.DateTime, default=datetime.utcnow)
    result_status = db.Column(db.String(50), default='final')  # preliminary, final, corrected
    
    # Laboratory Information
    performing_lab = db.Column(db.String(200))
    lab_technician_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=True)
    performed_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    
    # Interpretation
    interpretation = db.Column(db.Text)
    clinical_significance = db.Column(db.Text)
    notes = db.Column(db.Text)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'result_id': self.result_id,
            'order_id': self.order_id,
            'lab_order_id': self.lab_order_id,
            'patient_id': self.patient_id,
            'test_name': self.test_name,
            'result_value': self.result_value,
            'result_unit': self.result_unit or self.units,
            'units': self.units or self.result_unit,
            'reference_range': self.reference_range,
            'abnormal_flag': self.abnormal_flag,
            'status': self.status,
            'result_date': self.result_date.isoformat() if self.result_date else None,
            'result_status': self.result_status,
            'performing_lab': self.performing_lab,
            'performed_by': self.performed_by,
            'interpretation': self.interpretation,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class LabSpecimen(db.Model):
    __tablename__ = 'lab_specimens'

    id = db.Column(db.Integer, primary_key=True)
    accession_number = db.Column(db.String(60), unique=True, nullable=False, index=True)
    lab_order_id = db.Column(db.Integer, db.ForeignKey('lab_orders.id'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    specimen_type = db.Column(db.String(120), nullable=True)
    collection_time = db.Column(db.DateTime, default=datetime.utcnow)
    collected_by = db.Column(db.String(120), nullable=True)
    status = db.Column(db.String(40), default='collected')  # collected, received, processing, completed, rejected
    current_location = db.Column(db.String(120), nullable=True)
    storage_temp = db.Column(db.String(40), nullable=True)
    custody_log_json = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    lab_order = db.relationship('LabOrder')

    def to_dict(self):
        return {
            'id': self.id,
            'accession_number': self.accession_number,
            'lab_order_id': self.lab_order_id,
            'patient_id': self.patient_id,
            'specimen_type': self.specimen_type,
            'collection_time': self.collection_time.isoformat() if self.collection_time else None,
            'collected_by': self.collected_by,
            'status': self.status,
            'current_location': self.current_location,
            'storage_temp': self.storage_temp,
            'custody_log': json.loads(self.custody_log_json) if self.custody_log_json else [],
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class LabQCRecord(db.Model):
    __tablename__ = 'lab_qc_records'

    id = db.Column(db.Integer, primary_key=True)
    analyzer = db.Column(db.String(120), nullable=False)
    parameter = db.Column(db.String(100), nullable=False)
    control_level = db.Column(db.String(60), nullable=True)
    expected_value = db.Column(db.String(60), nullable=True)
    measured_value = db.Column(db.String(60), nullable=True)
    status = db.Column(db.String(20), default='pass')  # pass, fail, warning
    recorded_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    recorded_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'analyzer': self.analyzer,
            'parameter': self.parameter,
            'control_level': self.control_level,
            'expected_value': self.expected_value,
            'measured_value': self.measured_value,
            'status': self.status,
            'timestamp': self.recorded_at.isoformat() if self.recorded_at else None,
        }


class LabInventoryItem(db.Model):
    __tablename__ = 'lab_inventory_items'

    id = db.Column(db.Integer, primary_key=True)
    item = db.Column(db.String(160), nullable=False)
    stock = db.Column(db.Integer, default=0)
    reorder_level = db.Column(db.Integer, default=0)
    expiry_date = db.Column(db.Date, nullable=True)
    unit = db.Column(db.String(30), default='units')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        status = 'ok'
        if (self.stock or 0) <= (self.reorder_level or 0):
            status = 'low'
        return {
            'id': self.id,
            'item': self.item,
            'stock': self.stock or 0,
            'reorder_level': self.reorder_level or 0,
            'expiry_date': self.expiry_date.isoformat() if self.expiry_date else None,
            'status': status,
        }


class SOAPTemplate(db.Model):
    __tablename__ = 'soap_templates'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), nullable=False)
    specialty = db.Column(db.String(120), nullable=True)
    subjective = db.Column(db.Text, nullable=True)
    objective = db.Column(db.Text, nullable=True)
    assessment = db.Column(db.Text, nullable=True)
    plan = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'specialty': self.specialty,
            'subjective': self.subjective,
            'objective': self.objective,
            'assessment': self.assessment,
            'plan': self.plan,
            'is_active': self.is_active,
        }

# Cross-facility access model
class CrossFacilityAccess(db.Model):
    __tablename__ = 'cross_facility_access'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    source_facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    target_facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    requested_by_user_id = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=False)
    
    expires_at = db.Column(db.DateTime, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

