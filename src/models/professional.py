"""
Professional Sanitization Layer Models
"""
from datetime import datetime, date
from decimal import Decimal
from src.models.user import db

class ProfessionalCredential(db.Model):
    __tablename__ = 'professional_credentials'
    
    id = db.Column(db.Integer, primary_key=True)
    credential_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Provider
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=False)
    
    # Credential Details
    credential_type = db.Column(db.String(50), nullable=False)  # medical_license, nursing_license, pharmacy_license, board_certification
    credential_number = db.Column(db.String(100), nullable=False)
    issuing_authority = db.Column(db.String(200), nullable=False)
    issuing_state = db.Column(db.String(50))
    issuing_country = db.Column(db.String(50), default='USA')
    
    # Dates
    issue_date = db.Column(db.Date)
    expiry_date = db.Column(db.Date, nullable=False)
    renewal_date = db.Column(db.Date)
    
    # Document Storage
    document_url = db.Column(db.String(500))  # URL to uploaded credential document
    document_hash = db.Column(db.String(64))  # SHA-256 hash for verification
    
    # Verification
    is_verified = db.Column(db.Boolean, default=False)
    verified_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    verified_at = db.Column(db.DateTime)
    verification_notes = db.Column(db.Text)
    
    # Status
    status = db.Column(db.String(50), default='pending')  # pending, verified, expired, revoked, suspended
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'credential_id': self.credential_id,
            'provider_id': self.provider_id,
            'credential_type': self.credential_type,
            'credential_number': self.credential_number,
            'issuing_authority': self.issuing_authority,
            'expiry_date': self.expiry_date.isoformat() if self.expiry_date else None,
            'is_verified': self.is_verified,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class ProfessionalToken(db.Model):
    __tablename__ = 'professional_tokens'
    
    id = db.Column(db.Integer, primary_key=True)
    token_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Provider
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=False)
    user_account_id = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=False)
    
    # Token Details
    token_fee_amount = db.Column(db.Numeric(10, 2), nullable=False)
    payment_status = db.Column(db.String(50), default='pending')  # pending, paid, failed, refunded
    payment_date = db.Column(db.DateTime)
    payment_reference = db.Column(db.String(100))
    
    # Subscription Period
    subscription_start = db.Column(db.Date, nullable=False)
    subscription_end = db.Column(db.Date, nullable=False)
    
    # Features Enabled (JSON string)
    features_enabled = db.Column(db.Text)  # JSON: {"ai_consultation": true, "eprescribing": true, ...}
    
    # Status
    status = db.Column(db.String(50), default='active')  # active, expired, suspended, cancelled
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    renewals = db.relationship('ProfessionalTokenRenewal', backref='token', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'token_id': self.token_id,
            'provider_id': self.provider_id,
            'user_account_id': self.user_account_id,
            'token_fee_amount': float(self.token_fee_amount) if self.token_fee_amount else None,
            'payment_status': self.payment_status,
            'subscription_start': self.subscription_start.isoformat() if self.subscription_start else None,
            'subscription_end': self.subscription_end.isoformat() if self.subscription_end else None,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class ProfessionalTokenRenewal(db.Model):
    __tablename__ = 'professional_token_renewals'
    
    id = db.Column(db.Integer, primary_key=True)
    token_id = db.Column(db.Integer, db.ForeignKey('professional_tokens.id'), nullable=False)
    
    # Renewal Details
    renewal_date = db.Column(db.Date, nullable=False)
    renewal_fee_amount = db.Column(db.Numeric(10, 2), nullable=False)
    payment_status = db.Column(db.String(50), default='pending')
    payment_date = db.Column(db.DateTime)
    
    # New Period
    new_subscription_start = db.Column(db.Date, nullable=False)
    new_subscription_end = db.Column(db.Date, nullable=False)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'token_id': self.token_id,
            'renewal_date': self.renewal_date.isoformat() if self.renewal_date else None,
            'renewal_fee_amount': float(self.renewal_fee_amount) if self.renewal_fee_amount else None,
            'payment_status': self.payment_status,
            'new_subscription_start': self.new_subscription_start.isoformat() if self.new_subscription_start else None,
            'new_subscription_end': self.new_subscription_end.isoformat() if self.new_subscription_end else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class CredentialVerificationLog(db.Model):
    __tablename__ = 'credential_verification_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    log_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Credential
    credential_id = db.Column(db.Integer, db.ForeignKey('professional_credentials.id'), nullable=False)
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=False)
    
    # Verification Details
    verification_type = db.Column(db.String(50), nullable=False)  # initial, renewal, expiry_check, revocation_check
    verification_status = db.Column(db.String(50), nullable=False)  # verified, expired, revoked, not_found
    verification_source = db.Column(db.String(100))  # manual, api, automated
    
    # Details
    verification_result = db.Column(db.Text)  # JSON string with detailed results
    notes = db.Column(db.Text)
    
    # Action Taken
    action_taken = db.Column(db.String(100))  # account_suspended, account_activated, warning_sent
    
    # System Fields
    verified_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    verified_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'log_id': self.log_id,
            'credential_id': self.credential_id,
            'provider_id': self.provider_id,
            'verification_type': self.verification_type,
            'verification_status': self.verification_status,
            'action_taken': self.action_taken,
            'verified_at': self.verified_at.isoformat() if self.verified_at else None
        }

