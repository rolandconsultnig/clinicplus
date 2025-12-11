"""
SOAP Notes Model for Clinic+
Structured Subjective, Objective, Assessment, Plan documentation
"""

from datetime import datetime
from src.models.user import db

class SOAPNote(db.Model):
    __tablename__ = 'soap_notes'
    
    id = db.Column(db.Integer, primary_key=True)
    encounter_id = db.Column(db.Integer, db.ForeignKey('clinical_encounters.id'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=False)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    
    # SOAP Components
    subjective = db.Column(db.Text)  # Chief complaint, history of present illness, review of systems
    objective = db.Column(db.Text)  # Physical examination findings, vital signs, lab results
    assessment = db.Column(db.Text)  # Diagnosis, differential diagnosis, clinical impression
    plan = db.Column(db.Text)  # Treatment plan, medications, follow-up, patient education
    
    # Additional Fields
    chief_complaint = db.Column(db.String(500))
    history_of_present_illness = db.Column(db.Text)
    review_of_systems = db.Column(db.Text)
    physical_examination = db.Column(db.Text)
    assessment_notes = db.Column(db.Text)
    plan_details = db.Column(db.Text)
    
    # Status
    status = db.Column(db.String(50), default='draft')  # draft, final, signed, amended
    signed_by = db.Column(db.Integer, db.ForeignKey('providers.id'))
    signed_at = db.Column(db.DateTime)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    encounter = db.relationship('ClinicalEncounter', backref='soap_notes')
    patient = db.relationship('Patient', backref='soap_notes')
    provider = db.relationship('Provider', foreign_keys=[provider_id], backref='soap_notes')
    signer = db.relationship('Provider', foreign_keys=[signed_by])
    
    def to_dict(self):
        return {
            'id': self.id,
            'encounter_id': self.encounter_id,
            'patient_id': self.patient_id,
            'provider_id': self.provider_id,
            'facility_id': self.facility_id,
            'subjective': self.subjective,
            'objective': self.objective,
            'assessment': self.assessment,
            'plan': self.plan,
            'chief_complaint': self.chief_complaint,
            'history_of_present_illness': self.history_of_present_illness,
            'review_of_systems': self.review_of_systems,
            'physical_examination': self.physical_examination,
            'assessment_notes': self.assessment_notes,
            'plan_details': self.plan_details,
            'status': self.status,
            'signed_by': self.signed_by,
            'signed_at': self.signed_at.isoformat() if self.signed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by': self.created_by,
            'is_active': self.is_active
        }

