"""
Authentication and Authorization Models
"""
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from src.models.user import db

class UserAccount(db.Model):
    __tablename__ = 'user_accounts'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    
    # User Type and References
    user_type = db.Column(db.String(50), nullable=False)  # patient, provider, admin, facility_admin
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=True)
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=True)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=True)
    
    # Account Status
    is_active = db.Column(db.Boolean, default=True)
    is_verified = db.Column(db.Boolean, default=False)
    last_login = db.Column(db.DateTime)
    failed_login_attempts = db.Column(db.Integer, default=0)
    account_locked_until = db.Column(db.DateTime)
    
    # Multi-Factor Authentication
    mfa_enabled = db.Column(db.Boolean, default=False)
    mfa_secret = db.Column(db.String(32))  # TOTP secret
    
    # Password Management
    password_changed_at = db.Column(db.DateTime, default=datetime.utcnow)
    password_expires_at = db.Column(db.DateTime)
    must_change_password = db.Column(db.Boolean, default=False)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    roles = db.relationship('UserRole', foreign_keys='UserRole.user_account_id', backref='user_account', lazy=True)
    audit_logs = db.relationship('AuditLog', backref='user_account', lazy=True)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        self.password_changed_at = datetime.utcnow()
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def __repr__(self):
        return f'<UserAccount {self.username}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'user_type': self.user_type,
            'patient_id': self.patient_id,
            'provider_id': self.provider_id,
            'facility_id': self.facility_id,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'mfa_enabled': self.mfa_enabled,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Role(db.Model):
    __tablename__ = 'roles'
    
    id = db.Column(db.Integer, primary_key=True)
    role_name = db.Column(db.String(100), unique=True, nullable=False)
    role_description = db.Column(db.Text)
    
    # Role Categories
    role_category = db.Column(db.String(50))  # clinical, administrative, technical, patient
    facility_specific = db.Column(db.Boolean, default=True)  # Whether role is facility-specific
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    permissions = db.relationship('RolePermission', backref='role', lazy=True)
    user_roles = db.relationship('UserRole', backref='role', lazy=True)
    
    def __repr__(self):
        return f'<Role {self.role_name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'role_name': self.role_name,
            'role_description': self.role_description,
            'role_category': self.role_category,
            'facility_specific': self.facility_specific,
            'is_active': self.is_active
        }

class Permission(db.Model):
    __tablename__ = 'permissions'
    
    id = db.Column(db.Integer, primary_key=True)
    permission_name = db.Column(db.String(100), unique=True, nullable=False)
    permission_description = db.Column(db.Text)
    
    # Permission Details
    resource_type = db.Column(db.String(50))  # patient_data, clinical_notes, lab_results, etc.
    action = db.Column(db.String(50))  # read, write, update, delete, approve
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    role_permissions = db.relationship('RolePermission', backref='permission', lazy=True)
    
    def __repr__(self):
        return f'<Permission {self.permission_name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'permission_name': self.permission_name,
            'permission_description': self.permission_description,
            'resource_type': self.resource_type,
            'action': self.action,
            'is_active': self.is_active
        }

class UserRole(db.Model):
    __tablename__ = 'user_roles'
    
    id = db.Column(db.Integer, primary_key=True)
    user_account_id = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=False)
    role_id = db.Column(db.Integer, db.ForeignKey('roles.id'), nullable=False)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=True)
    
    # Assignment Details
    assigned_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    assigned_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime)
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_account_id': self.user_account_id,
            'role_id': self.role_id,
            'facility_id': self.facility_id,
            'assigned_at': self.assigned_at.isoformat() if self.assigned_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_active': self.is_active
        }

class RolePermission(db.Model):
    __tablename__ = 'role_permissions'
    
    id = db.Column(db.Integer, primary_key=True)
    role_id = db.Column(db.Integer, db.ForeignKey('roles.id'), nullable=False)
    permission_id = db.Column(db.Integer, db.ForeignKey('permissions.id'), nullable=False)
    
    # Permission Constraints
    data_scope = db.Column(db.String(50))  # own_patients, department_patients, all_patients
    conditions = db.Column(db.Text)  # JSON string for additional conditions
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'role_id': self.role_id,
            'permission_id': self.permission_id,
            'data_scope': self.data_scope,
            'is_active': self.is_active
        }

class PatientDataAccess(db.Model):
    __tablename__ = 'patient_data_access'
    
    id = db.Column(db.Integer, primary_key=True)
    access_token = db.Column(db.String(255), unique=True, nullable=False, index=True)
    
    # Access Details
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    requesting_facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    source_facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    
    # Permissions
    data_types_allowed = db.Column(db.Text)  # JSON string: demographics, medical_history, lab_results, etc.
    date_range_start = db.Column(db.Date)
    date_range_end = db.Column(db.Date)
    
    # Access Control
    granted_by_patient = db.Column(db.Boolean, default=False)
    granted_at = db.Column(db.DateTime)
    expires_at = db.Column(db.DateTime, nullable=False)
    
    # Usage Tracking
    access_count = db.Column(db.Integer, default=0)
    last_accessed = db.Column(db.DateTime)
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    revoked_at = db.Column(db.DateTime)
    revoked_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'access_token': self.access_token,
            'patient_id': self.patient_id,
            'requesting_facility_id': self.requesting_facility_id,
            'source_facility_id': self.source_facility_id,
            'granted_at': self.granted_at.isoformat() if self.granted_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'access_count': self.access_count,
            'last_accessed': self.last_accessed.isoformat() if self.last_accessed else None,
            'is_active': self.is_active
        }

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    log_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # User and Session Information
    user_id = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    session_id = db.Column(db.String(100))
    ip_address = db.Column(db.String(45))  # IPv6 compatible
    user_agent = db.Column(db.Text)
    
    # Action Information
    action_type = db.Column(db.String(50), nullable=False)  # login, logout, view, create, update, delete
    resource_type = db.Column(db.String(50))  # patient, encounter, lab_result, etc.
    resource_id = db.Column(db.String(50))
    
    # Patient Data Access (for HIPAA compliance)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=True)
    data_accessed = db.Column(db.Text)  # JSON string describing what data was accessed
    
    # Request Details
    endpoint = db.Column(db.String(200))
    http_method = db.Column(db.String(10))
    request_data = db.Column(db.Text)  # JSON string (sanitized)
    response_status = db.Column(db.Integer)
    
    # Additional details field
    details = db.Column(db.Text)  # JSON string for additional details
    
    # Timing
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    duration_ms = db.Column(db.Integer)
    
    # Outcome
    success = db.Column(db.Boolean)
    error_message = db.Column(db.Text)
    
    # Facility Context
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=True)
    
    def __repr__(self):
        return f'<AuditLog {self.log_id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'log_id': self.log_id,
            'user_id': self.user_id,
            'action_type': self.action_type,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'patient_id': self.patient_id,
            'endpoint': self.endpoint,
            'http_method': self.http_method,
            'response_status': self.response_status,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'success': self.success,
            'facility_id': self.facility_id
        }

class PatientOTP(db.Model):
    """OTP model for patient authorization of provider access"""
    __tablename__ = 'patient_otps'
    
    id = db.Column(db.Integer, primary_key=True)
    otp_code = db.Column(db.String(6), nullable=False, index=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    
    # Provider/Facility requesting access
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=True)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=True)
    
    # OTP Details
    phone_number = db.Column(db.String(20), nullable=False)  # Phone number OTP was sent to
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    verified_at = db.Column(db.DateTime, nullable=True)
    verified_by_provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=True)
    
    # Access scope (what data can be accessed with this OTP)
    access_scope = db.Column(db.Text)  # JSON string: ['demographics', 'medical_history', 'lab_results', etc.]
    
    # Status
    is_used = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    
    # Attempts tracking
    verification_attempts = db.Column(db.Integer, default=0)
    max_attempts = db.Column(db.Integer, default=3)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<PatientOTP {self.otp_code} for Patient {self.patient_id}>'
    
    def is_expired(self):
        """Check if OTP has expired"""
        return datetime.utcnow() > self.expires_at
    
    def is_valid(self):
        """Check if OTP is valid (not expired, not used, active, within attempt limit)"""
        return (
            self.is_active and
            not self.is_used and
            not self.is_expired() and
            self.verification_attempts < self.max_attempts
        )
    
    def to_dict(self):
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'provider_id': self.provider_id,
            'facility_id': self.facility_id,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'verified_at': self.verified_at.isoformat() if self.verified_at else None,
            'is_used': self.is_used,
            'is_active': self.is_active,
            'is_expired': self.is_expired(),
            'is_valid': self.is_valid(),
            'verification_attempts': self.verification_attempts,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

