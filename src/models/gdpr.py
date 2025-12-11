"""
GDPR Compliance Models
EU General Data Protection Regulation compliance
"""
from datetime import datetime, date, timedelta
from src.models.user import db
import json

class GDPRConsent(db.Model):
    """GDPR Consent Records"""
    __tablename__ = 'gdpr_consents'
    
    id = db.Column(db.Integer, primary_key=True)
    consent_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Patient Reference
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    
    # Consent Details
    consent_type = db.Column(db.String(100), nullable=False)  # data_processing, marketing, research, sharing
    consent_purpose = db.Column(db.Text)  # Purpose of consent
    consent_method = db.Column(db.String(50))  # explicit, implied, opt_in, opt_out
    
    # Consent Status
    is_granted = db.Column(db.Boolean, default=False)
    granted_at = db.Column(db.DateTime)
    withdrawn_at = db.Column(db.DateTime)
    
    # Legal Basis
    legal_basis = db.Column(db.String(100))  # consent, contract, legal_obligation, vital_interests, public_task, legitimate_interests
    
    # Expiry
    expires_at = db.Column(db.DateTime)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'consent_id': self.consent_id,
            'patient_id': self.patient_id,
            'consent_type': self.consent_type,
            'consent_purpose': self.consent_purpose,
            'consent_method': self.consent_method,
            'is_granted': self.is_granted,
            'granted_at': self.granted_at.isoformat() if self.granted_at else None,
            'withdrawn_at': self.withdrawn_at.isoformat() if self.withdrawn_at else None,
            'legal_basis': self.legal_basis,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None
        }

class GDPRDataRequest(db.Model):
    """GDPR Data Subject Access Requests"""
    __tablename__ = 'gdpr_data_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Patient Reference
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    
    # Request Details
    request_type = db.Column(db.String(50), nullable=False)  # access, rectification, erasure, portability, restriction, objection
    request_description = db.Column(db.Text)
    
    # Status
    status = db.Column(db.String(50), default='pending')  # pending, in_progress, completed, rejected
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    
    # Response
    response_data = db.Column(db.Text)  # JSON string with response data
    response_file_path = db.Column(db.String(500))  # Path to exported data file
    
    # Verification
    identity_verified = db.Column(db.Boolean, default=False)
    identity_verification_method = db.Column(db.String(100))
    verified_at = db.Column(db.DateTime)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    processed_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'request_id': self.request_id,
            'patient_id': self.patient_id,
            'request_type': self.request_type,
            'request_description': self.request_description,
            'status': self.status,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'identity_verified': self.identity_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class GDPRDataProcessingActivity(db.Model):
    """GDPR Article 30 - Record of Processing Activities"""
    __tablename__ = 'gdpr_processing_activities'
    
    id = db.Column(db.Integer, primary_key=True)
    activity_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Processing Details
    activity_name = db.Column(db.String(200), nullable=False)
    activity_description = db.Column(db.Text)
    processing_purpose = db.Column(db.Text)
    
    # Data Categories
    data_categories = db.Column(db.Text)  # JSON array of data categories
    
    # Data Subjects
    data_subject_categories = db.Column(db.Text)  # JSON array (patients, employees, etc.)
    
    # Recipients
    recipients = db.Column(db.Text)  # JSON array of recipient categories
    
    # Transfers
    third_country_transfers = db.Column(db.Boolean, default=False)
    transfer_countries = db.Column(db.Text)  # JSON array
    
    # Retention
    retention_period = db.Column(db.String(100))  # e.g., "7 years", "indefinite"
    retention_justification = db.Column(db.Text)
    
    # Security Measures
    security_measures = db.Column(db.Text)  # JSON array
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'activity_id': self.activity_id,
            'activity_name': self.activity_name,
            'activity_description': self.activity_description,
            'processing_purpose': self.processing_purpose,
            'data_categories': json.loads(self.data_categories) if self.data_categories else [],
            'data_subject_categories': json.loads(self.data_subject_categories) if self.data_subject_categories else [],
            'recipients': json.loads(self.recipients) if self.recipients else [],
            'third_country_transfers': self.third_country_transfers,
            'transfer_countries': json.loads(self.transfer_countries) if self.transfer_countries else [],
            'retention_period': self.retention_period,
            'security_measures': json.loads(self.security_measures) if self.security_measures else []
        }

class GDPRBreach(db.Model):
    """GDPR Personal Data Breach Records"""
    __tablename__ = 'gdpr_breaches'
    
    id = db.Column(db.Integer, primary_key=True)
    breach_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Breach Details
    breach_type = db.Column(db.String(100), nullable=False)  # confidentiality, integrity, availability
    breach_description = db.Column(db.Text, nullable=False)
    breach_date = db.Column(db.DateTime, nullable=False)
    discovered_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Affected Data
    affected_data_categories = db.Column(db.Text)  # JSON array
    affected_data_subjects = db.Column(db.Integer)  # Number of affected individuals
    
    # Impact Assessment
    risk_level = db.Column(db.String(50))  # low, medium, high
    impact_description = db.Column(db.Text)
    
    # Notification
    supervisory_authority_notified = db.Column(db.Boolean, default=False)
    supervisory_authority_notified_at = db.Column(db.DateTime)
    data_subjects_notified = db.Column(db.Boolean, default=False)
    data_subjects_notified_at = db.Column(db.DateTime)
    
    # Remediation
    remediation_actions = db.Column(db.Text)  # JSON array
    remediation_completed = db.Column(db.Boolean, default=False)
    
    # Status
    status = db.Column(db.String(50), default='reported')  # reported, investigating, resolved, closed
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    reported_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'breach_id': self.breach_id,
            'breach_type': self.breach_type,
            'breach_description': self.breach_description,
            'breach_date': self.breach_date.isoformat() if self.breach_date else None,
            'discovered_at': self.discovered_at.isoformat() if self.discovered_at else None,
            'affected_data_categories': json.loads(self.affected_data_categories) if self.affected_data_categories else [],
            'affected_data_subjects': self.affected_data_subjects,
            'risk_level': self.risk_level,
            'supervisory_authority_notified': self.supervisory_authority_notified,
            'data_subjects_notified': self.data_subjects_notified,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class GDPRDataRetentionPolicy(db.Model):
    """GDPR Data Retention Policies"""
    __tablename__ = 'gdpr_retention_policies'
    
    id = db.Column(db.Integer, primary_key=True)
    policy_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Policy Details
    policy_name = db.Column(db.String(200), nullable=False)
    data_category = db.Column(db.String(100), nullable=False)  # medical_records, billing, consent, etc.
    retention_period_years = db.Column(db.Integer, nullable=False)
    retention_justification = db.Column(db.Text)
    
    # Legal Basis
    legal_basis = db.Column(db.Text)
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'policy_id': self.policy_id,
            'policy_name': self.policy_name,
            'data_category': self.data_category,
            'retention_period_years': self.retention_period_years,
            'retention_justification': self.retention_justification,
            'legal_basis': self.legal_basis,
            'is_active': self.is_active
        }

