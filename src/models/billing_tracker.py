"""
Billing Tracker Models for Clinic+
Track billing status and workflow
"""

from datetime import datetime
from src.models.user import db

class BillingTracker(db.Model):
    __tablename__ = 'billing_trackers'
    
    id = db.Column(db.Integer, primary_key=True)
    tracker_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Claim Information
    claim_id = db.Column(db.Integer, db.ForeignKey('claims.id'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    
    # Tracking Details
    current_status = db.Column(db.String(50), nullable=False)  # submitted, pending, approved, denied, paid, rejected
    status_history = db.Column(db.Text)  # JSON array of status changes
    
    # Submission Details
    submitted_at = db.Column(db.DateTime)
    submitted_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    submission_method = db.Column(db.String(50))  # electronic, paper, fax
    submission_reference = db.Column(db.String(100))  # EDI reference number
    
    # Processing Details
    payer_id = db.Column(db.Integer, db.ForeignKey('insurance_companies.id'))
    payer_response_date = db.Column(db.DateTime)
    payer_response_code = db.Column(db.String(50))
    payer_response_message = db.Column(db.Text)
    
    # Payment Details
    expected_payment = db.Column(db.Numeric(10, 2))
    actual_payment = db.Column(db.Numeric(10, 2))
    payment_date = db.Column(db.Date)
    
    # Denial/Rejection Details
    denial_reason = db.Column(db.Text)
    denial_code = db.Column(db.String(50))
    appeal_required = db.Column(db.Boolean, default=False)
    appeal_submitted = db.Column(db.Boolean, default=False)
    appeal_date = db.Column(db.Date)
    
    # Follow-up
    next_followup_date = db.Column(db.Date)
    last_followup_date = db.Column(db.Date)
    followup_notes = db.Column(db.Text)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    claim = db.relationship('Claim', backref='billing_trackers')
    patient = db.relationship('Patient', backref='billing_trackers')
    facility = db.relationship('Facility', backref='billing_trackers')
    # payer = db.relationship('InsuranceCompany', backref='billing_trackers')  # Commented out - will be enabled after InsuranceCompany is imported
    
    def to_dict(self):
        return {
            'id': self.id,
            'tracker_id': self.tracker_id,
            'claim_id': self.claim_id,
            'patient_id': self.patient_id,
            'facility_id': self.facility_id,
            'current_status': self.current_status,
            'status_history': self.status_history,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'submitted_by': self.submitted_by,
            'submission_method': self.submission_method,
            'submission_reference': self.submission_reference,
            'payer_id': self.payer_id,
            'payer_response_date': self.payer_response_date.isoformat() if self.payer_response_date else None,
            'payer_response_code': self.payer_response_code,
            'payer_response_message': self.payer_response_message,
            'expected_payment': float(self.expected_payment) if self.expected_payment else None,
            'actual_payment': float(self.actual_payment) if self.actual_payment else None,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'denial_reason': self.denial_reason,
            'denial_code': self.denial_code,
            'appeal_required': self.appeal_required,
            'appeal_submitted': self.appeal_submitted,
            'appeal_date': self.appeal_date.isoformat() if self.appeal_date else None,
            'next_followup_date': self.next_followup_date.isoformat() if self.next_followup_date else None,
            'last_followup_date': self.last_followup_date.isoformat() if self.last_followup_date else None,
            'followup_notes': self.followup_notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'is_active': self.is_active
        }

