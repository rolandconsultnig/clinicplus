"""
Care Plans Models for Clinic+
Comprehensive care planning with templates
"""

from datetime import datetime
from src.models.user import db

class CarePlan(db.Model):
    __tablename__ = 'care_plans'
    
    id = db.Column(db.Integer, primary_key=True)
    care_plan_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Patient and Provider
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=False)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    encounter_id = db.Column(db.Integer, db.ForeignKey('clinical_encounters.id'), nullable=True)
    
    # Care Plan Details
    plan_name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    plan_type = db.Column(db.String(100))  # chronic_disease, preventive, acute_care, post_surgical
    
    # Goals
    goals = db.Column(db.Text)  # JSON array of goals
    target_date = db.Column(db.Date)
    
    # Interventions
    interventions = db.Column(db.Text)  # JSON array of interventions
    
    # Status
    status = db.Column(db.String(50), default='active')  # active, completed, cancelled, on_hold
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date)
    
    # Review
    last_review_date = db.Column(db.Date)
    next_review_date = db.Column(db.Date)
    review_frequency = db.Column(db.String(50))  # weekly, monthly, quarterly, as_needed
    
    # Outcomes
    outcomes = db.Column(db.Text)  # JSON array of outcomes
    effectiveness_rating = db.Column(db.Integer)  # 1-5 scale
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    patient = db.relationship('Patient', backref='care_plans')
    provider = db.relationship('Provider', backref='care_plans')
    facility = db.relationship('Facility', backref='care_plans')
    encounter = db.relationship('ClinicalEncounter', backref='care_plans')
    
    def to_dict(self):
        return {
            'id': self.id,
            'care_plan_id': self.care_plan_id,
            'patient_id': self.patient_id,
            'provider_id': self.provider_id,
            'facility_id': self.facility_id,
            'encounter_id': self.encounter_id,
            'plan_name': self.plan_name,
            'description': self.description,
            'plan_type': self.plan_type,
            'goals': self.goals,
            'target_date': self.target_date.isoformat() if self.target_date else None,
            'interventions': self.interventions,
            'status': self.status,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'last_review_date': self.last_review_date.isoformat() if self.last_review_date else None,
            'next_review_date': self.next_review_date.isoformat() if self.next_review_date else None,
            'review_frequency': self.review_frequency,
            'outcomes': self.outcomes,
            'effectiveness_rating': self.effectiveness_rating,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by': self.created_by,
            'is_active': self.is_active
        }

class CarePlanTemplate(db.Model):
    __tablename__ = 'care_plan_templates'
    
    id = db.Column(db.Integer, primary_key=True)
    template_name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    plan_type = db.Column(db.String(100))
    
    # Template Content
    default_goals = db.Column(db.Text)  # JSON array
    default_interventions = db.Column(db.Text)  # JSON array
    default_review_frequency = db.Column(db.String(50))
    
    # Usage
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=True)
    is_global = db.Column(db.Boolean, default=False)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    facility = db.relationship('Facility', backref='care_plan_templates')
    
    def to_dict(self):
        return {
            'id': self.id,
            'template_name': self.template_name,
            'description': self.description,
            'plan_type': self.plan_type,
            'default_goals': self.default_goals,
            'default_interventions': self.default_interventions,
            'default_review_frequency': self.default_review_frequency,
            'facility_id': self.facility_id,
            'is_global': self.is_global,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by': self.created_by,
            'is_active': self.is_active
        }

