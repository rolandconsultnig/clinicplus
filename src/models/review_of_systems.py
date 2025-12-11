"""
Review of Systems (ROS) Model for Clinic+
Systematic review of body systems
"""

from datetime import datetime
from src.models.user import db

class ReviewOfSystems(db.Model):
    __tablename__ = 'review_of_systems'
    
    id = db.Column(db.Integer, primary_key=True)
    encounter_id = db.Column(db.Integer, db.ForeignKey('clinical_encounters.id'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=False)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    
    # Constitutional Symptoms
    constitutional = db.Column(db.Text)
    fever = db.Column(db.Boolean)
    chills = db.Column(db.Boolean)
    weight_loss = db.Column(db.Boolean)
    weight_gain = db.Column(db.Boolean)
    fatigue = db.Column(db.Boolean)
    weakness = db.Column(db.Boolean)
    constitutional_notes = db.Column(db.Text)
    
    # Eyes
    eyes = db.Column(db.Text)
    vision_changes = db.Column(db.Boolean)
    eye_pain = db.Column(db.Boolean)
    eye_redness = db.Column(db.Boolean)
    eye_discharge = db.Column(db.Boolean)
    eyes_notes = db.Column(db.Text)
    
    # Ears, Nose, Throat
    ent = db.Column(db.Text)
    hearing_loss = db.Column(db.Boolean)
    ear_pain = db.Column(db.Boolean)
    tinnitus = db.Column(db.Boolean)
    nasal_congestion = db.Column(db.Boolean)
    nosebleeds = db.Column(db.Boolean)
    sore_throat = db.Column(db.Boolean)
    hoarseness = db.Column(db.Boolean)
    ent_notes = db.Column(db.Text)
    
    # Cardiovascular
    cardiovascular = db.Column(db.Text)
    chest_pain = db.Column(db.Boolean)
    palpitations = db.Column(db.Boolean)
    shortness_of_breath = db.Column(db.Boolean)
    orthopnea = db.Column(db.Boolean)
    paroxysmal_nocturnal_dyspnea = db.Column(db.Boolean)
    edema = db.Column(db.Boolean)
    cardiovascular_notes = db.Column(db.Text)
    
    # Respiratory
    respiratory = db.Column(db.Text)
    cough = db.Column(db.Boolean)
    sputum = db.Column(db.Boolean)
    hemoptysis = db.Column(db.Boolean)
    wheezing = db.Column(db.Boolean)
    respiratory_notes = db.Column(db.Text)
    
    # Gastrointestinal
    gastrointestinal = db.Column(db.Text)
    nausea = db.Column(db.Boolean)
    vomiting = db.Column(db.Boolean)
    diarrhea = db.Column(db.Boolean)
    constipation = db.Column(db.Boolean)
    abdominal_pain = db.Column(db.Boolean)
    bloating = db.Column(db.Boolean)
    blood_in_stool = db.Column(db.Boolean)
    gastrointestinal_notes = db.Column(db.Text)
    
    # Genitourinary
    genitourinary = db.Column(db.Text)
    dysuria = db.Column(db.Boolean)
    frequency = db.Column(db.Boolean)
    urgency = db.Column(db.Boolean)
    hematuria = db.Column(db.Boolean)
    incontinence = db.Column(db.Boolean)
    discharge = db.Column(db.Boolean)
    genitourinary_notes = db.Column(db.Text)
    
    # Musculoskeletal
    musculoskeletal = db.Column(db.Text)
    joint_pain = db.Column(db.Boolean)
    joint_swelling = db.Column(db.Boolean)
    muscle_pain = db.Column(db.Boolean)
    muscle_weakness = db.Column(db.Boolean)
    back_pain = db.Column(db.Boolean)
    stiffness = db.Column(db.Boolean)
    musculoskeletal_notes = db.Column(db.Text)
    
    # Neurological
    neurological = db.Column(db.Text)
    headache = db.Column(db.Boolean)
    dizziness = db.Column(db.Boolean)
    syncope = db.Column(db.Boolean)
    seizures = db.Column(db.Boolean)
    weakness = db.Column(db.Boolean)
    numbness = db.Column(db.Boolean)
    tingling = db.Column(db.Boolean)
    memory_problems = db.Column(db.Boolean)
    neurological_notes = db.Column(db.Text)
    
    # Psychiatric
    psychiatric = db.Column(db.Text)
    depression = db.Column(db.Boolean)
    anxiety = db.Column(db.Boolean)
    mood_changes = db.Column(db.Boolean)
    sleep_disturbance = db.Column(db.Boolean)
    appetite_changes = db.Column(db.Boolean)
    psychiatric_notes = db.Column(db.Text)
    
    # Endocrine
    endocrine = db.Column(db.Text)
    heat_intolerance = db.Column(db.Boolean)
    cold_intolerance = db.Column(db.Boolean)
    polyuria = db.Column(db.Boolean)
    polydipsia = db.Column(db.Boolean)
    endocrine_notes = db.Column(db.Text)
    
    # Hematologic/Lymphatic
    hematologic = db.Column(db.Text)
    easy_bruising = db.Column(db.Boolean)
    bleeding = db.Column(db.Boolean)
    lymph_node_swelling = db.Column(db.Boolean)
    hematologic_notes = db.Column(db.Text)
    
    # Allergic/Immunologic
    allergic = db.Column(db.Text)
    allergies = db.Column(db.Boolean)
    allergic_reactions = db.Column(db.Boolean)
    allergic_notes = db.Column(db.Text)
    
    # Skin
    skin = db.Column(db.Text)
    rashes = db.Column(db.Boolean)
    itching = db.Column(db.Boolean)
    skin_changes = db.Column(db.Boolean)
    hair_changes = db.Column(db.Boolean)
    nail_changes = db.Column(db.Boolean)
    skin_notes = db.Column(db.Text)
    
    # Additional Notes
    additional_notes = db.Column(db.Text)
    
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
    encounter = db.relationship('ClinicalEncounter', backref='review_of_systems')
    patient = db.relationship('Patient', backref='review_of_systems')
    provider = db.relationship('Provider', foreign_keys=[provider_id], backref='review_of_systems')
    signer = db.relationship('Provider', foreign_keys=[signed_by])
    
    def to_dict(self):
        return {
            'id': self.id,
            'encounter_id': self.encounter_id,
            'patient_id': self.patient_id,
            'provider_id': self.provider_id,
            'facility_id': self.facility_id,
            'constitutional': self.constitutional,
            'eyes': self.eyes,
            'ent': self.ent,
            'cardiovascular': self.cardiovascular,
            'respiratory': self.respiratory,
            'gastrointestinal': self.gastrointestinal,
            'genitourinary': self.genitourinary,
            'musculoskeletal': self.musculoskeletal,
            'neurological': self.neurological,
            'psychiatric': self.psychiatric,
            'endocrine': self.endocrine,
            'hematologic': self.hematologic,
            'allergic': self.allergic,
            'skin': self.skin,
            'additional_notes': self.additional_notes,
            'status': self.status,
            'signed_by': self.signed_by,
            'signed_at': self.signed_at.isoformat() if self.signed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by': self.created_by,
            'is_active': self.is_active
        }

