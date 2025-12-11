"""
Treatment Plans Models for Clinic+
Treatment plan documentation
"""

from datetime import datetime
from src.models.user import db

class TreatmentPlan(db.Model):
    __tablename__ = 'treatment_plans'
    
    id = db.Column(db.Integer, primary_key=True)
    treatment_plan_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Patient and Provider
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=False)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    encounter_id = db.Column(db.Integer, db.ForeignKey('clinical_encounters.id'), nullable=True)
    
    # Treatment Plan Details
    plan_name = db.Column(db.String(200), nullable=False)
    diagnosis = db.Column(db.Text)
    treatment_goals = db.Column(db.Text)
    treatment_approach = db.Column(db.Text)
    
    # Treatment Components
    medications = db.Column(db.Text)  # JSON array
    procedures = db.Column(db.Text)  # JSON array
    therapies = db.Column(db.Text)  # JSON array
    lifestyle_modifications = db.Column(db.Text)
    patient_education = db.Column(db.Text)
    
    # Timeline
    start_date = db.Column(db.Date, nullable=False)
    expected_duration = db.Column(db.String(100))  # e.g., "6 weeks", "3 months"
    end_date = db.Column(db.Date)
    
    # Follow-up
    follow_up_required = db.Column(db.Boolean, default=True)
    follow_up_frequency = db.Column(db.String(50))
    next_follow_up_date = db.Column(db.Date)
    
    # Status
    status = db.Column(db.String(50), default='active')  # active, completed, modified, cancelled
    
    # Outcomes
    progress_notes = db.Column(db.Text)
    outcome_assessment = db.Column(db.Text)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    patient = db.relationship('Patient', backref='treatment_plans')
    provider = db.relationship('Provider', backref='treatment_plans')
    facility = db.relationship('Facility', backref='treatment_plans')
    encounter = db.relationship('ClinicalEncounter', backref='treatment_plans')
    
    def to_dict(self):
        return {
            'id': self.id,
            'treatment_plan_id': self.treatment_plan_id,
            'patient_id': self.patient_id,
            'provider_id': self.provider_id,
            'facility_id': self.facility_id,
            'encounter_id': self.encounter_id,
            'plan_name': self.plan_name,
            'diagnosis': self.diagnosis,
            'treatment_goals': self.treatment_goals,
            'treatment_approach': self.treatment_approach,
            'medications': self.medications,
            'procedures': self.procedures,
            'therapies': self.therapies,
            'lifestyle_modifications': self.lifestyle_modifications,
            'patient_education': self.patient_education,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'expected_duration': self.expected_duration,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'follow_up_required': self.follow_up_required,
            'follow_up_frequency': self.follow_up_frequency,
            'next_follow_up_date': self.next_follow_up_date.isoformat() if self.next_follow_up_date else None,
            'status': self.status,
            'progress_notes': self.progress_notes,
            'outcome_assessment': self.outcome_assessment,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by': self.created_by,
            'is_active': self.is_active
        }

