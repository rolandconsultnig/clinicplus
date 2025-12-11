"""
Clinical Forms Models - Comprehensive OpenEMR-style clinical forms
Supports all 30+ clinical form types from OpenEMR
"""
from datetime import datetime
from src.models.user import db
import json

class ClinicalForm(db.Model):
    """Generic clinical form model that can handle all OpenEMR form types"""
    __tablename__ = 'clinical_forms'
    
    id = db.Column(db.Integer, primary_key=True)
    form_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Form Identification
    form_type = db.Column(db.String(100), nullable=False, index=True)  # soap, physical_exam, ros, vitals, etc.
    form_name = db.Column(db.String(200))  # Human-readable form name
    
    # Patient and Encounter Association
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    encounter_id = db.Column(db.Integer, db.ForeignKey('clinical_encounters.id'), nullable=True)
    
    # Provider Information
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    
    # Form Data (stored as JSON for flexibility)
    form_data = db.Column(db.Text)  # JSON string containing all form fields
    
    # Form Status
    form_status = db.Column(db.String(50), default='draft')  # draft, completed, signed, locked
    is_locked = db.Column(db.Boolean, default=False)
    
    # Dates
    form_date = db.Column(db.DateTime, default=datetime.utcnow)
    completed_date = db.Column(db.DateTime)
    signed_date = db.Column(db.DateTime)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def get_form_data(self):
        """Parse JSON form data"""
        if self.form_data:
            try:
                return json.loads(self.form_data)
            except:
                return {}
        return {}
    
    def set_form_data(self, data):
        """Store form data as JSON"""
        self.form_data = json.dumps(data) if data else None
    
    def to_dict(self):
        return {
            'id': self.id,
            'form_id': self.form_id,
            'form_type': self.form_type,
            'form_name': self.form_name,
            'patient_id': self.patient_id,
            'encounter_id': self.encounter_id,
            'provider_id': self.provider_id,
            'form_status': self.form_status,
            'is_locked': self.is_locked,
            'form_date': self.form_date.isoformat() if self.form_date else None,
            'completed_date': self.completed_date.isoformat() if self.completed_date else None,
            'signed_date': self.signed_date.isoformat() if self.signed_date else None,
            'form_data': self.get_form_data(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

# Specific form models for type safety (optional, can use ClinicalForm for all)

class SOAPForm(db.Model):
    """SOAP Note Form"""
    __tablename__ = 'soap_forms'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    encounter_id = db.Column(db.Integer, db.ForeignKey('clinical_encounters.id'), nullable=True)
    
    # SOAP Components
    subjective = db.Column(db.Text)
    objective = db.Column(db.Text)
    assessment = db.Column(db.Text)
    plan = db.Column(db.Text)
    
    # Additional fields
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=True)
    form_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'encounter_id': self.encounter_id,
            'subjective': self.subjective,
            'objective': self.objective,
            'assessment': self.assessment,
            'plan': self.plan,
            'form_date': self.form_date.isoformat() if self.form_date else None
        }

class PhysicalExamForm(db.Model):
    """Physical Examination Form"""
    __tablename__ = 'physical_exam_forms'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    encounter_id = db.Column(db.Integer, db.ForeignKey('clinical_encounters.id'), nullable=True)
    
    # Physical Exam Sections
    general_appearance = db.Column(db.Text)
    head_neck = db.Column(db.Text)
    eyes = db.Column(db.Text)
    ears = db.Column(db.Text)
    nose_throat = db.Column(db.Text)
    cardiovascular = db.Column(db.Text)
    respiratory = db.Column(db.Text)
    abdomen = db.Column(db.Text)
    genitourinary = db.Column(db.Text)
    musculoskeletal = db.Column(db.Text)
    neurological = db.Column(db.Text)
    skin = db.Column(db.Text)
    lymph_nodes = db.Column(db.Text)
    other = db.Column(db.Text)
    
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=True)
    form_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'encounter_id': self.encounter_id,
            'general_appearance': self.general_appearance,
            'head_neck': self.head_neck,
            'eyes': self.eyes,
            'ears': self.ears,
            'nose_throat': self.nose_throat,
            'cardiovascular': self.cardiovascular,
            'respiratory': self.respiratory,
            'abdomen': self.abdomen,
            'genitourinary': self.genitourinary,
            'musculoskeletal': self.musculoskeletal,
            'neurological': self.neurological,
            'skin': self.skin,
            'lymph_nodes': self.lymph_nodes,
            'other': self.other,
            'form_date': self.form_date.isoformat() if self.form_date else None
        }

class ReviewOfSystemsForm(db.Model):
    """Review of Systems Form"""
    __tablename__ = 'ros_forms'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    encounter_id = db.Column(db.Integer, db.ForeignKey('clinical_encounters.id'), nullable=True)
    
    # ROS Sections
    constitutional = db.Column(db.Text)
    eyes = db.Column(db.Text)
    ears_nose_throat = db.Column(db.Text)
    cardiovascular = db.Column(db.Text)
    respiratory = db.Column(db.Text)
    gastrointestinal = db.Column(db.Text)
    genitourinary = db.Column(db.Text)
    musculoskeletal = db.Column(db.Text)
    integumentary = db.Column(db.Text)
    neurological = db.Column(db.Text)
    psychiatric = db.Column(db.Text)
    endocrine = db.Column(db.Text)
    hematologic_lymphatic = db.Column(db.Text)
    allergic_immunologic = db.Column(db.Text)
    
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=True)
    form_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'encounter_id': self.encounter_id,
            'constitutional': self.constitutional,
            'eyes': self.eyes,
            'ears_nose_throat': self.ears_nose_throat,
            'cardiovascular': self.cardiovascular,
            'respiratory': self.respiratory,
            'gastrointestinal': self.gastrointestinal,
            'genitourinary': self.genitourinary,
            'musculoskeletal': self.musculoskeletal,
            'integumentary': self.integumentary,
            'neurological': self.neurological,
            'psychiatric': self.psychiatric,
            'endocrine': self.endocrine,
            'hematologic_lymphatic': self.hematologic_lymphatic,
            'allergic_immunologic': self.allergic_immunologic,
            'form_date': self.form_date.isoformat() if self.form_date else None
        }

# Form Types Registry
FORM_TYPES = {
    'soap': 'SOAP Note',
    'physical_exam': 'Physical Examination',
    'ros': 'Review of Systems',
    'vitals': 'Vital Signs',
    'clinical_notes': 'Clinical Notes',
    'care_plan': 'Care Plan',
    'treatment_plan': 'Treatment Plan',
    'functional_cognitive_status': 'Functional Cognitive Status',
    'observation': 'Observation',
    'painmap': 'Pain Map',
    'gad7': 'GAD-7 Assessment',
    'aftercare_plan': 'Aftercare Plan',
    'ankleinjury': 'Ankle Injury',
    'bronchitis': 'Bronchitis',
    'CAMOS': 'CAMOS',
    'clinic_note': 'Clinic Note',
    'clinical_instructions': 'Clinical Instructions',
    'dictation': 'Dictation',
    'eye_mag': 'Eye MAG',
    'fee_sheet': 'Fee Sheet',
    'group_attendance': 'Group Attendance',
    'misc_billing_options': 'Misc Billing Options',
    'newGroupEncounter': 'New Group Encounter',
    'newpatient': 'New Patient',
    'note': 'Note',
    'prior_auth': 'Prior Authorization',
    'procedure_order': 'Procedure Order',
    'questionnaire_assessments': 'Questionnaire Assessments',
    'requisition': 'Requisition',
    'reviewofs': 'Review of Systems (Legacy)',
    'sdoh': 'Social Determinants of Health',
    'track_anything': 'Track Anything',
    'transfer_summary': 'Transfer Summary',
    'lbf': 'Layout Based Form'
}

