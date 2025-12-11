"""
Physical Examination Model for Clinic+
Comprehensive physical examination documentation
"""

from datetime import datetime
from src.models.user import db

class PhysicalExam(db.Model):
    __tablename__ = 'physical_exams'
    
    id = db.Column(db.Integer, primary_key=True)
    encounter_id = db.Column(db.Integer, db.ForeignKey('clinical_encounters.id'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=False)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    
    # General Appearance
    general_appearance = db.Column(db.Text)
    alertness = db.Column(db.String(50))  # alert, drowsy, obtunded, comatose
    distress = db.Column(db.String(50))  # none, mild, moderate, severe
    
    # Vital Signs (can reference VitalSigns table or store here)
    temperature = db.Column(db.Float)
    blood_pressure_systolic = db.Column(db.Integer)
    blood_pressure_diastolic = db.Column(db.Integer)
    heart_rate = db.Column(db.Integer)
    respiratory_rate = db.Column(db.Integer)
    oxygen_saturation = db.Column(db.Float)
    weight = db.Column(db.Float)
    height = db.Column(db.Float)
    bmi = db.Column(db.Float)
    
    # Head, Eyes, Ears, Nose, Throat (HEENT)
    heent = db.Column(db.Text)
    head = db.Column(db.Text)
    eyes = db.Column(db.Text)
    ears = db.Column(db.Text)
    nose = db.Column(db.Text)
    throat = db.Column(db.Text)
    
    # Cardiovascular
    cardiovascular = db.Column(db.Text)
    heart_rate_regular = db.Column(db.Boolean)
    heart_sounds = db.Column(db.Text)
    murmurs = db.Column(db.Text)
    peripheral_pulses = db.Column(db.Text)
    edema = db.Column(db.Text)
    
    # Respiratory
    respiratory = db.Column(db.Text)
    chest_symmetry = db.Column(db.String(50))
    breath_sounds = db.Column(db.Text)
    wheezing = db.Column(db.Boolean)
    rales = db.Column(db.Boolean)
    rhonchi = db.Column(db.Boolean)
    
    # Gastrointestinal
    gastrointestinal = db.Column(db.Text)
    abdomen_appearance = db.Column(db.Text)
    bowel_sounds = db.Column(db.Text)
    tenderness = db.Column(db.Text)
    masses = db.Column(db.Text)
    organomegaly = db.Column(db.Text)
    
    # Genitourinary
    genitourinary = db.Column(db.Text)
    
    # Musculoskeletal
    musculoskeletal = db.Column(db.Text)
    range_of_motion = db.Column(db.Text)
    strength = db.Column(db.Text)
    deformities = db.Column(db.Text)
    
    # Neurological
    neurological = db.Column(db.Text)
    mental_status = db.Column(db.Text)
    cranial_nerves = db.Column(db.Text)
    motor_exam = db.Column(db.Text)
    sensory_exam = db.Column(db.Text)
    reflexes = db.Column(db.Text)
    coordination = db.Column(db.Text)
    gait = db.Column(db.Text)
    
    # Skin
    skin = db.Column(db.Text)
    skin_color = db.Column(db.String(50))
    skin_condition = db.Column(db.Text)
    lesions = db.Column(db.Text)
    rashes = db.Column(db.Text)
    
    # Lymphatic
    lymphatic = db.Column(db.Text)
    lymph_nodes = db.Column(db.Text)
    
    # Additional Notes
    additional_findings = db.Column(db.Text)
    clinical_impression = db.Column(db.Text)
    
    # Status
    status = db.Column(db.String(50), default='draft')  # draft, final, signed
    signed_by = db.Column(db.Integer, db.ForeignKey('providers.id'))
    signed_at = db.Column(db.DateTime)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    encounter = db.relationship('ClinicalEncounter', backref='physical_exams')
    patient = db.relationship('Patient', backref='physical_exams')
    provider = db.relationship('Provider', foreign_keys=[provider_id], backref='physical_exams')
    signer = db.relationship('Provider', foreign_keys=[signed_by])
    
    def to_dict(self):
        return {
            'id': self.id,
            'encounter_id': self.encounter_id,
            'patient_id': self.patient_id,
            'provider_id': self.provider_id,
            'facility_id': self.facility_id,
            'general_appearance': self.general_appearance,
            'alertness': self.alertness,
            'distress': self.distress,
            'temperature': self.temperature,
            'blood_pressure_systolic': self.blood_pressure_systolic,
            'blood_pressure_diastolic': self.blood_pressure_diastolic,
            'heart_rate': self.heart_rate,
            'respiratory_rate': self.respiratory_rate,
            'oxygen_saturation': self.oxygen_saturation,
            'weight': self.weight,
            'height': self.height,
            'bmi': self.bmi,
            'heent': self.heent,
            'cardiovascular': self.cardiovascular,
            'respiratory': self.respiratory,
            'gastrointestinal': self.gastrointestinal,
            'genitourinary': self.genitourinary,
            'musculoskeletal': self.musculoskeletal,
            'neurological': self.neurological,
            'skin': self.skin,
            'lymphatic': self.lymphatic,
            'additional_findings': self.additional_findings,
            'clinical_impression': self.clinical_impression,
            'status': self.status,
            'signed_by': self.signed_by,
            'signed_at': self.signed_at.isoformat() if self.signed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by': self.created_by,
            'is_active': self.is_active
        }

