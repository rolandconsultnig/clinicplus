from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
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
    encounter_status = db.Column(db.String(50))  # scheduled, in_progress, completed, cancelled
    
    # Clinical Information
    chief_complaint = db.Column(db.Text)
    history_present_illness = db.Column(db.Text)
    assessment = db.Column(db.Text)
    plan = db.Column(db.Text)
    
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
            'assessment': self.assessment,
            'plan': self.plan,
            'duration_minutes': self.duration_minutes,
            'visit_reason': self.visit_reason,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class VitalSigns(db.Model):
    __tablename__ = 'vital_signs'
    
    id = db.Column(db.Integer, primary_key=True)
    encounter_id = db.Column(db.Integer, db.ForeignKey('clinical_encounters.id'), nullable=False)
    
    # Vital Signs Measurements
    systolic_bp = db.Column(db.Integer)  # mmHg
    diastolic_bp = db.Column(db.Integer)  # mmHg
    heart_rate = db.Column(db.Integer)  # bpm
    respiratory_rate = db.Column(db.Integer)  # breaths per minute
    temperature = db.Column(db.Float)  # Fahrenheit
    oxygen_saturation = db.Column(db.Float)  # percentage
    
    # Physical Measurements
    height_inches = db.Column(db.Float)
    weight_pounds = db.Column(db.Float)
    bmi = db.Column(db.Float)
    
    # Pain Assessment
    pain_scale = db.Column(db.Integer)  # 0-10 scale
    
    # Measurement Details
    measured_by = db.Column(db.Integer, db.ForeignKey('providers.id'))
    measurement_time = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.Column(db.Text)
    
    def to_dict(self):
        return {
            'id': self.id,
            'encounter_id': self.encounter_id,
            'systolic_bp': self.systolic_bp,
            'diastolic_bp': self.diastolic_bp,
            'heart_rate': self.heart_rate,
            'respiratory_rate': self.respiratory_rate,
            'temperature': self.temperature,
            'oxygen_saturation': self.oxygen_saturation,
            'height_inches': self.height_inches,
            'weight_pounds': self.weight_pounds,
            'bmi': self.bmi,
            'pain_scale': self.pain_scale,
            'measurement_time': self.measurement_time.isoformat() if self.measurement_time else None,
            'notes': self.notes
        }

class ClinicalNote(db.Model):
    __tablename__ = 'clinical_notes'
    
    id = db.Column(db.Integer, primary_key=True)
    encounter_id = db.Column(db.Integer, db.ForeignKey('clinical_encounters.id'), nullable=False)
    
    # Note Information
    note_type = db.Column(db.String(50), nullable=False)  # progress_note, discharge_summary, consultation, etc.
    note_title = db.Column(db.String(200))
    note_content = db.Column(db.Text, nullable=False)
    
    # Authoring Information
    author_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=False)
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
            'encounter_id': self.encounter_id,
            'note_type': self.note_type,
            'note_title': self.note_title,
            'note_content': self.note_content,
            'author_id': self.author_id,
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
    
    # Test Information
    test_name = db.Column(db.String(200), nullable=False)
    test_code = db.Column(db.String(50))  # LOINC code
    test_category = db.Column(db.String(100))  # chemistry, hematology, microbiology, etc.
    
    # Order Details
    order_date = db.Column(db.DateTime, default=datetime.utcnow)
    priority = db.Column(db.String(20))  # routine, urgent, stat
    clinical_indication = db.Column(db.Text)
    
    # Status
    order_status = db.Column(db.String(50), default='ordered')  # ordered, collected, in_progress, completed, cancelled
    
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
            'test_name': self.test_name,
            'test_code': self.test_code,
            'test_category': self.test_category,
            'order_date': self.order_date.isoformat() if self.order_date else None,
            'priority': self.priority,
            'clinical_indication': self.clinical_indication,
            'order_status': self.order_status,
            'collection_date': self.collection_date.isoformat() if self.collection_date else None,
            'specimen_type': self.specimen_type
        }

class LabResult(db.Model):
    __tablename__ = 'lab_results'
    
    id = db.Column(db.Integer, primary_key=True)
    result_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Result Information
    lab_order_id = db.Column(db.Integer, db.ForeignKey('lab_orders.id'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    
    # Test Results
    test_name = db.Column(db.String(200), nullable=False)
    result_value = db.Column(db.String(100))
    result_unit = db.Column(db.String(50))
    reference_range = db.Column(db.String(100))
    abnormal_flag = db.Column(db.String(20))  # normal, high, low, critical
    
    # Result Details
    result_date = db.Column(db.DateTime, default=datetime.utcnow)
    result_status = db.Column(db.String(50), default='final')  # preliminary, final, corrected
    
    # Laboratory Information
    performing_lab = db.Column(db.String(200))
    lab_technician_id = db.Column(db.Integer, db.ForeignKey('providers.id'))
    
    # Interpretation
    interpretation = db.Column(db.Text)
    clinical_significance = db.Column(db.Text)
    
    def to_dict(self):
        return {
            'id': self.id,
            'result_id': self.result_id,
            'lab_order_id': self.lab_order_id,
            'patient_id': self.patient_id,
            'test_name': self.test_name,
            'result_value': self.result_value,
            'result_unit': self.result_unit,
            'reference_range': self.reference_range,
            'abnormal_flag': self.abnormal_flag,
            'result_date': self.result_date.isoformat() if self.result_date else None,
            'result_status': self.result_status,
            'performing_lab': self.performing_lab,
            'interpretation': self.interpretation
        }

