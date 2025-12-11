"""
Professional Credentialing Models
Comprehensive models for credentialing, privileging, and compliance tracking
"""
from datetime import datetime, date
from decimal import Decimal
from src.models.user import db
import json

class CredentialingApplication(db.Model):
    """Credentialing application workflow"""
    __tablename__ = 'credentialing_applications'
    
    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Provider
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=False)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    
    # Application Details
    application_type = db.Column(db.String(50), nullable=False)  # initial, reappointment, add_privilege
    application_status = db.Column(db.String(50), default='draft')  # draft, submitted, under_review, approved, rejected
    
    # Workflow
    current_step = db.Column(db.String(100))
    completed_steps = db.Column(db.Text)  # JSON array of completed step IDs
    form_data = db.Column(db.Text)  # JSON string of all form responses
    
    # Dates
    submitted_at = db.Column(db.DateTime)
    review_started_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    due_date = db.Column(db.Date)
    
    # Review
    reviewed_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    review_notes = db.Column(db.Text)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'application_id': self.application_id,
            'provider_id': self.provider_id,
            'facility_id': self.facility_id,
            'application_type': self.application_type,
            'application_status': self.application_status,
            'current_step': self.current_step,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class PrimarySourceVerification(db.Model):
    """Primary Source Verification logs"""
    __tablename__ = 'primary_source_verifications'
    
    id = db.Column(db.Integer, primary_key=True)
    psv_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Credential
    credential_id = db.Column(db.Integer, db.ForeignKey('professional_credentials.id'), nullable=False)
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=False)
    
    # Verification Source
    verification_source = db.Column(db.String(100), nullable=False)  # state_board, npdb, dea, oig, caqh
    source_url = db.Column(db.String(500))
    api_endpoint = db.Column(db.String(500))
    
    # Verification Details
    verification_status = db.Column(db.String(50), nullable=False)  # verified, not_found, expired, revoked
    verification_date = db.Column(db.DateTime, nullable=False)
    verification_result = db.Column(db.Text)  # JSON string with detailed results
    
    # Response Data
    response_data = db.Column(db.Text)  # JSON string of raw API response
    match_score = db.Column(db.Numeric(5, 2))  # Confidence score 0-100
    
    # System Fields
    verified_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'psv_id': self.psv_id,
            'credential_id': self.credential_id,
            'provider_id': self.provider_id,
            'verification_source': self.verification_source,
            'verification_status': self.verification_status,
            'verification_date': self.verification_date.isoformat() if self.verification_date else None,
            'match_score': float(self.match_score) if self.match_score else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class CredentialDocument(db.Model):
    """Document Management System for credentials"""
    __tablename__ = 'credential_documents'
    
    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Associations
    credential_id = db.Column(db.Integer, db.ForeignKey('professional_credentials.id'), nullable=False)
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=False)
    
    # Document Details
    document_type = db.Column(db.String(100), nullable=False)  # license, diploma, certificate, malpractice_insurance
    document_name = db.Column(db.String(200), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer)  # bytes
    mime_type = db.Column(db.String(100))
    
    # Version Control
    version_number = db.Column(db.Integer, default=1)
    is_current = db.Column(db.Boolean, default=True)
    replaced_by = db.Column(db.Integer, db.ForeignKey('credential_documents.id'))
    
    # Security
    document_hash = db.Column(db.String(64))  # SHA-256 hash
    encrypted = db.Column(db.Boolean, default=False)
    
    # Audit
    uploaded_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'document_id': self.document_id,
            'credential_id': self.credential_id,
            'document_type': self.document_type,
            'document_name': self.document_name,
            'file_path': self.file_path,
            'version_number': self.version_number,
            'is_current': self.is_current,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None
        }

class ClinicalPrivilege(db.Model):
    """Clinical Privilege Dictionary"""
    __tablename__ = 'clinical_privileges'
    
    id = db.Column(db.Integer, primary_key=True)
    privilege_code = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Privilege Details
    privilege_name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(100))  # surgical, medical, diagnostic, therapeutic
    specialty = db.Column(db.String(100))  # cardiology, surgery, etc.
    
    # Requirements
    required_board_certification = db.Column(db.Text)  # JSON array
    required_training = db.Column(db.Text)  # JSON string
    minimum_experience_years = db.Column(db.Integer)
    requires_proctoring = db.Column(db.Boolean, default=False)
    
    # Risk Level
    risk_level = db.Column(db.String(50))  # low, medium, high, critical
    
    # System Fields
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'privilege_code': self.privilege_code,
            'privilege_name': self.privilege_name,
            'description': self.description,
            'category': self.category,
            'specialty': self.specialty,
            'risk_level': self.risk_level,
            'requires_proctoring': self.requires_proctoring,
            'is_active': self.is_active
        }

class ProviderPrivilege(db.Model):
    """Provider's requested/granted privileges"""
    __tablename__ = 'provider_privileges'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Associations
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=False)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    privilege_id = db.Column(db.Integer, db.ForeignKey('clinical_privileges.id'), nullable=False)
    
    # Status
    status = db.Column(db.String(50), default='requested')  # requested, granted, temporarily_restricted, revoked, denied
    request_date = db.Column(db.Date, nullable=False)
    granted_date = db.Column(db.Date)
    expiry_date = db.Column(db.Date)
    
    # Proctoring
    requires_proctoring = db.Column(db.Boolean, default=False)
    proctoring_status = db.Column(db.String(50))  # not_started, in_progress, completed, failed
    proctoring_cases_required = db.Column(db.Integer, default=0)
    proctoring_cases_completed = db.Column(db.Integer, default=0)
    proctor_id = db.Column(db.Integer, db.ForeignKey('providers.id'))
    proctoring_completed_at = db.Column(db.DateTime)
    
    # Review
    reviewed_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    review_notes = db.Column(db.Text)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'provider_id': self.provider_id,
            'facility_id': self.facility_id,
            'privilege_id': self.privilege_id,
            'status': self.status,
            'request_date': self.request_date.isoformat() if self.request_date else None,
            'granted_date': self.granted_date.isoformat() if self.granted_date else None,
            'requires_proctoring': self.requires_proctoring,
            'proctoring_status': self.proctoring_status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class CMETracking(db.Model):
    """Continuing Medical Education Tracking"""
    __tablename__ = 'cme_tracking'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Provider
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=False)
    
    # CME Details
    activity_name = db.Column(db.String(200), nullable=False)
    activity_type = db.Column(db.String(100))  # conference, online, journal, workshop
    provider_name = db.Column(db.String(200))  # CME provider organization
    accreditation_number = db.Column(db.String(100))
    
    # Credits
    credits_earned = db.Column(db.Numeric(5, 2), nullable=False)
    credit_type = db.Column(db.String(50))  # AMA_PRA_Category1, Category2, etc.
    
    # Dates
    activity_date = db.Column(db.Date, nullable=False)
    completion_date = db.Column(db.Date)
    certificate_date = db.Column(db.Date)
    
    # Documentation
    certificate_url = db.Column(db.String(500))
    verification_status = db.Column(db.String(50), default='pending')  # pending, verified, rejected
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    verified_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    verified_at = db.Column(db.DateTime)
    
    def to_dict(self):
        return {
            'id': self.id,
            'provider_id': self.provider_id,
            'activity_name': self.activity_name,
            'activity_type': self.activity_type,
            'credits_earned': float(self.credits_earned) if self.credits_earned else 0,
            'credit_type': self.credit_type,
            'activity_date': self.activity_date.isoformat() if self.activity_date else None,
            'verification_status': self.verification_status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class SanctionExclusion(db.Model):
    """Sanction and Exclusion Monitoring"""
    __tablename__ = 'sanction_exclusions'
    
    id = db.Column(db.Integer, primary_key=True)
    sanction_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Provider
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=False)
    
    # Sanction Details
    source = db.Column(db.String(100), nullable=False)  # OIG, SAM, State Board
    sanction_type = db.Column(db.String(100))  # exclusion, suspension, revocation
    sanction_date = db.Column(db.Date, nullable=False)
    effective_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    
    # Details
    reason = db.Column(db.Text)
    source_url = db.Column(db.String(500))
    source_reference = db.Column(db.String(200))
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    resolved = db.Column(db.Boolean, default=False)
    resolved_date = db.Column(db.Date)
    resolution_notes = db.Column(db.Text)
    
    # System Fields
    detected_at = db.Column(db.DateTime, default=datetime.utcnow)
    detected_by = db.Column(db.String(100), default='automated_monitoring')
    
    def to_dict(self):
        return {
            'id': self.id,
            'sanction_id': self.sanction_id,
            'provider_id': self.provider_id,
            'source': self.source,
            'sanction_type': self.sanction_type,
            'sanction_date': self.sanction_date.isoformat() if self.sanction_date else None,
            'is_active': self.is_active,
            'detected_at': self.detected_at.isoformat() if self.detected_at else None
        }

class RecredentialingCycle(db.Model):
    """Recredentialing Cycle Management"""
    __tablename__ = 'recredentialing_cycles'
    
    id = db.Column(db.Integer, primary_key=True)
    cycle_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Provider
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=False)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    
    # Cycle Details
    cycle_type = db.Column(db.String(50), nullable=False)  # initial, reappointment_2yr, reappointment_3yr
    cycle_start_date = db.Column(db.Date, nullable=False)
    cycle_end_date = db.Column(db.Date, nullable=False)
    next_recredentialing_date = db.Column(db.Date, nullable=False)
    
    # Status
    status = db.Column(db.String(50), default='active')  # active, in_review, completed, overdue
    application_id = db.Column(db.Integer, db.ForeignKey('credentialing_applications.id'))
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'cycle_id': self.cycle_id,
            'provider_id': self.provider_id,
            'facility_id': self.facility_id,
            'cycle_type': self.cycle_type,
            'cycle_start_date': self.cycle_start_date.isoformat() if self.cycle_start_date else None,
            'cycle_end_date': self.cycle_end_date.isoformat() if self.cycle_end_date else None,
            'next_recredentialing_date': self.next_recredentialing_date.isoformat() if self.next_recredentialing_date else None,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class CredentialingAuditLog(db.Model):
    """Comprehensive Audit Trail"""
    __tablename__ = 'credentialing_audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    log_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Entity
    entity_type = db.Column(db.String(50), nullable=False)  # credential, privilege, application, document
    entity_id = db.Column(db.Integer, nullable=False)
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'))
    
    # Action
    action_type = db.Column(db.String(100), nullable=False)  # created, updated, deleted, viewed, verified, approved
    action_description = db.Column(db.Text)
    
    # Changes
    old_values = db.Column(db.Text)  # JSON string
    new_values = db.Column(db.Text)  # JSON string
    
    # User
    performed_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    performed_by_name = db.Column(db.String(200))
    ip_address = db.Column(db.String(50))
    user_agent = db.Column(db.String(500))
    
    # System Fields
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'log_id': self.log_id,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'provider_id': self.provider_id,
            'action_type': self.action_type,
            'action_description': self.action_description,
            'performed_by_name': self.performed_by_name,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }

class CredentialingTemplate(db.Model):
    """Template and Form Builder"""
    __tablename__ = 'credentialing_templates'
    
    id = db.Column(db.Integer, primary_key=True)
    template_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Template Details
    template_name = db.Column(db.String(200), nullable=False)
    template_type = db.Column(db.String(50), nullable=False)  # application, reappointment, add_privilege
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'))
    state = db.Column(db.String(50))  # State-specific templates
    
    # Form Structure
    form_structure = db.Column(db.Text, nullable=False)  # JSON string defining form fields
    workflow_steps = db.Column(db.Text)  # JSON array of workflow steps
    
    # Standards
    based_on_standard = db.Column(db.String(100))  # CAQH, Joint Commission, etc.
    version = db.Column(db.String(20), default='1.0')
    
    # System Fields
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'template_id': self.template_id,
            'template_name': self.template_name,
            'template_type': self.template_type,
            'facility_id': self.facility_id,
            'state': self.state,
            'version': self.version,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

