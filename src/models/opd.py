"""
Out-Patient Department (OPD) Workflow Models
Handles walk-in patient workflow from registration to discharge
"""
from datetime import datetime, date
from src.models.user import db

class OPDVisit(db.Model):
    """OPD Visit - Main workflow tracking"""
    __tablename__ = 'opd_visits'
    
    id = db.Column(db.Integer, primary_key=True)
    visit_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Patient Information
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    
    # Visit Details
    visit_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    visit_type = db.Column(db.String(50), default='walk_in')  # walk_in, scheduled, emergency
    chief_complaint = db.Column(db.Text)
    
    # Workflow Status
    workflow_status = db.Column(db.String(50), default='arrived')  
    # arrived, registered, triaged, vitals_taken, in_queue, in_consultation, 
    # investigation_ordered, investigation_completed, treatment_planned, discharged
    
    # Registration Details
    registration_token = db.Column(db.String(20))  # Token number for queue
    registration_fee_paid = db.Column(db.Boolean, default=False)
    registration_fee_amount = db.Column(db.Float, default=0.0)
    
    # Triage Information
    triage_priority = db.Column(db.String(20))  # urgent, high, medium, low
    triage_notes = db.Column(db.Text)
    triaged_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    triaged_at = db.Column(db.DateTime)
    
    # Provider Assignment
    assigned_provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'))
    assigned_clinic = db.Column(db.String(100))
    
    # Queue Information
    queue_position = db.Column(db.Integer)
    queue_number = db.Column(db.String(20))
    called_at = db.Column(db.DateTime)
    
    # Consultation
    consultation_started_at = db.Column(db.DateTime)
    consultation_completed_at = db.Column(db.DateTime)
    encounter_id = db.Column(db.Integer, db.ForeignKey('clinical_encounters.id'))
    
    # Investigation Status
    investigations_ordered = db.Column(db.Boolean, default=False)
    investigations_completed = db.Column(db.Boolean, default=False)
    investigation_payment_pending = db.Column(db.Boolean, default=False)
    
    # Discharge Information
    discharged_at = db.Column(db.DateTime)
    discharge_notes = db.Column(db.Text)
    follow_up_required = db.Column(db.Boolean, default=False)
    follow_up_date = db.Column(db.Date)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    
    # Relationships
    patient = db.relationship('Patient', backref='opd_visits')
    facility = db.relationship('Facility', backref='opd_visits')
    provider = db.relationship('Provider', backref='opd_visits')
    encounter = db.relationship('ClinicalEncounter', backref='opd_visit')
    triage_user = db.relationship('UserAccount', foreign_keys=[triaged_by])
    
    def to_dict(self):
        return {
            'id': self.id,
            'visit_id': self.visit_id,
            'patient_id': self.patient_id,
            'facility_id': self.facility_id,
            'visit_date': self.visit_date.isoformat() if self.visit_date else None,
            'visit_type': self.visit_type,
            'chief_complaint': self.chief_complaint,
            'workflow_status': self.workflow_status,
            'registration_token': self.registration_token,
            'registration_fee_paid': self.registration_fee_paid,
            'registration_fee_amount': self.registration_fee_amount,
            'triage_priority': self.triage_priority,
            'triage_notes': self.triage_notes,
            'assigned_provider_id': self.assigned_provider_id,
            'assigned_clinic': self.assigned_clinic,
            'queue_position': self.queue_position,
            'queue_number': self.queue_number,
            'investigations_ordered': self.investigations_ordered,
            'investigations_completed': self.investigations_completed,
            'discharged_at': self.discharged_at.isoformat() if self.discharged_at else None,
            'discharge_notes': self.discharge_notes,
            'follow_up_required': self.follow_up_required,
            'follow_up_date': self.follow_up_date.isoformat() if self.follow_up_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class OPDQueue(db.Model):
    """OPD Queue Management"""
    __tablename__ = 'opd_queue'
    
    id = db.Column(db.Integer, primary_key=True)
    visit_id = db.Column(db.Integer, db.ForeignKey('opd_visits.id'), nullable=False)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'))
    clinic_name = db.Column(db.String(100))
    
    # Queue Details
    queue_number = db.Column(db.String(20), nullable=False)
    queue_position = db.Column(db.Integer, nullable=False)
    priority = db.Column(db.String(20), default='normal')  # urgent, high, normal, low
    
    # Status
    status = db.Column(db.String(50), default='waiting')  # waiting, called, in_consultation, completed, cancelled
    called_at = db.Column(db.DateTime)
    consultation_started_at = db.Column(db.DateTime)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    visit = db.relationship('OPDVisit', backref='queue_entry')
    facility = db.relationship('Facility', backref='opd_queues')
    provider = db.relationship('Provider', backref='opd_queues')
    
    def to_dict(self):
        return {
            'id': self.id,
            'visit_id': self.visit_id,
            'facility_id': self.facility_id,
            'provider_id': self.provider_id,
            'clinic_name': self.clinic_name,
            'queue_number': self.queue_number,
            'queue_position': self.queue_position,
            'priority': self.priority,
            'status': self.status,
            'called_at': self.called_at.isoformat() if self.called_at else None,
            'consultation_started_at': self.consultation_started_at.isoformat() if self.consultation_started_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }










