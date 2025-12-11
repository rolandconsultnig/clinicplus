"""
Clinical Reminders Model for Clinic+
Automated clinical reminders and care gap management
"""

from datetime import datetime
from src.models.user import db

class ClinicalReminder(db.Model):
    __tablename__ = 'clinical_reminders'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=True)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    
    # Reminder Details
    reminder_type = db.Column(db.String(100), nullable=False)  # immunization, screening, medication, lab, followup
    reminder_category = db.Column(db.String(100))  # preventive, chronic_care, acute_care
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    
    # Reminder Criteria
    criteria_type = db.Column(db.String(100))  # age_based, diagnosis_based, medication_based, lab_based
    criteria_details = db.Column(db.Text)  # JSON string for complex criteria
    
    # Due Date and Status
    due_date = db.Column(db.Date)
    completed_date = db.Column(db.Date)
    status = db.Column(db.String(50), default='active')  # active, completed, dismissed, overdue
    
    # Priority
    priority = db.Column(db.String(50), default='normal')  # low, normal, high, critical
    
    # Related Records
    related_encounter_id = db.Column(db.Integer, db.ForeignKey('clinical_encounters.id'))
    related_lab_order_id = db.Column(db.Integer, db.ForeignKey('lab_orders.id'))
    related_prescription_id = db.Column(db.Integer, db.ForeignKey('prescriptions.id'))
    related_immunization_id = db.Column(db.Integer)  # Reference to immunization record
    
    # Action Taken
    action_taken = db.Column(db.Text)
    action_taken_by = db.Column(db.Integer, db.ForeignKey('providers.id'))
    action_taken_at = db.Column(db.DateTime)
    
    # Notification
    notified = db.Column(db.Boolean, default=False)
    notified_at = db.Column(db.DateTime)
    notification_method = db.Column(db.String(50))  # email, sms, in_app, all
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    patient = db.relationship('Patient', backref='clinical_reminders')
    provider = db.relationship('Provider', foreign_keys=[provider_id], backref='clinical_reminders')
    facility = db.relationship('Facility', backref='clinical_reminders')
    encounter = db.relationship('ClinicalEncounter', backref='clinical_reminders')
    action_provider = db.relationship('Provider', foreign_keys=[action_taken_by])
    
    def to_dict(self):
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'provider_id': self.provider_id,
            'facility_id': self.facility_id,
            'reminder_type': self.reminder_type,
            'reminder_category': self.reminder_category,
            'title': self.title,
            'description': self.description,
            'criteria_type': self.criteria_type,
            'criteria_details': self.criteria_details,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'completed_date': self.completed_date.isoformat() if self.completed_date else None,
            'status': self.status,
            'priority': self.priority,
            'related_encounter_id': self.related_encounter_id,
            'related_lab_order_id': self.related_lab_order_id,
            'related_prescription_id': self.related_prescription_id,
            'related_immunization_id': self.related_immunization_id,
            'action_taken': self.action_taken,
            'action_taken_by': self.action_taken_by,
            'action_taken_at': self.action_taken_at.isoformat() if self.action_taken_at else None,
            'notified': self.notified,
            'notified_at': self.notified_at.isoformat() if self.notified_at else None,
            'notification_method': self.notification_method,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by': self.created_by,
            'is_active': self.is_active
        }

class ReminderRule(db.Model):
    __tablename__ = 'reminder_rules'
    
    id = db.Column(db.Integer, primary_key=True)
    rule_name = db.Column(db.String(200), nullable=False)
    rule_description = db.Column(db.Text)
    
    # Rule Type
    rule_type = db.Column(db.String(100), nullable=False)  # immunization, screening, medication, lab, followup
    
    # Rule Criteria (JSON)
    criteria = db.Column(db.Text)  # JSON string containing rule criteria
    
    # Reminder Configuration
    reminder_title = db.Column(db.String(200))
    reminder_description = db.Column(db.Text)
    priority = db.Column(db.String(50), default='normal')
    
    # Timing
    due_date_calculation = db.Column(db.Text)  # JSON for calculating due date
    recurrence = db.Column(db.String(100))  # once, daily, weekly, monthly, yearly
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    applies_to_all_patients = db.Column(db.Boolean, default=False)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'rule_name': self.rule_name,
            'rule_description': self.rule_description,
            'rule_type': self.rule_type,
            'criteria': self.criteria,
            'reminder_title': self.reminder_title,
            'reminder_description': self.reminder_description,
            'priority': self.priority,
            'due_date_calculation': self.due_date_calculation,
            'recurrence': self.recurrence,
            'is_active': self.is_active,
            'applies_to_all_patients': self.applies_to_all_patients,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by': self.created_by
        }

