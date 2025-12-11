"""
ERA (Electronic Remittance Advice) Models for Clinic+
Automated payment posting and EOB processing
"""

from datetime import datetime
from src.models.user import db

class ERA(db.Model):
    __tablename__ = 'eras'
    
    id = db.Column(db.Integer, primary_key=True)
    era_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # ERA Details
    payer_id = db.Column(db.Integer, db.ForeignKey('insurance_companies.id'), nullable=False)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    
    # File Information
    file_name = db.Column(db.String(255))
    file_path = db.Column(db.String(500))
    file_received_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    # ERA Header Information
    payer_name = db.Column(db.String(200))
    payer_tax_id = db.Column(db.String(50))
    payer_address = db.Column(db.Text)
    check_number = db.Column(db.String(50))
    check_date = db.Column(db.Date)
    check_amount = db.Column(db.Numeric(10, 2))
    
    # Processing Status
    status = db.Column(db.String(50), default='received')  # received, processing, processed, error
    processed_at = db.Column(db.DateTime)
    processed_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    
    # Summary
    total_claims = db.Column(db.Integer, default=0)
    total_paid = db.Column(db.Numeric(10, 2), default=0)
    total_adjusted = db.Column(db.Numeric(10, 2), default=0)
    total_denied = db.Column(db.Numeric(10, 2), default=0)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    # payer = db.relationship('InsuranceCompany', backref='eras')  # Commented out - will be enabled after InsuranceCompany is imported
    facility = db.relationship('Facility', backref='eras')
    
    def to_dict(self):
        return {
            'id': self.id,
            'era_id': self.era_id,
            'payer_id': self.payer_id,
            'facility_id': self.facility_id,
            'file_name': self.file_name,
            'file_path': self.file_path,
            'file_received_date': self.file_received_date.isoformat() if self.file_received_date else None,
            'payer_name': self.payer_name,
            'payer_tax_id': self.payer_tax_id,
            'payer_address': self.payer_address,
            'check_number': self.check_number,
            'check_date': self.check_date.isoformat() if self.check_date else None,
            'check_amount': float(self.check_amount) if self.check_amount else None,
            'status': self.status,
            'processed_at': self.processed_at.isoformat() if self.processed_at else None,
            'processed_by': self.processed_by,
            'total_claims': self.total_claims,
            'total_paid': float(self.total_paid) if self.total_paid else None,
            'total_adjusted': float(self.total_adjusted) if self.total_adjusted else None,
            'total_denied': float(self.total_denied) if self.total_denied else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'is_active': self.is_active
        }

class ERAClaim(db.Model):
    __tablename__ = 'era_claims'
    
    id = db.Column(db.Integer, primary_key=True)
    era_id = db.Column(db.Integer, db.ForeignKey('eras.id'), nullable=False)
    claim_id = db.Column(db.Integer, db.ForeignKey('claims.id'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    
    # Payment Information
    claim_status = db.Column(db.String(50))  # paid, denied, adjusted, pending
    paid_amount = db.Column(db.Numeric(10, 2))
    patient_responsibility = db.Column(db.Numeric(10, 2))
    adjustment_amount = db.Column(db.Numeric(10, 2))
    denial_code = db.Column(db.String(50))
    denial_reason = db.Column(db.Text)
    
    # Dates
    service_date_from = db.Column(db.Date)
    service_date_to = db.Column(db.Date)
    payment_date = db.Column(db.Date)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    era = db.relationship('ERA', backref='era_claims')
    claim = db.relationship('Claim', backref='era_claims')
    patient = db.relationship('Patient', backref='era_claims')
    
    def to_dict(self):
        return {
            'id': self.id,
            'era_id': self.era_id,
            'claim_id': self.claim_id,
            'patient_id': self.patient_id,
            'claim_status': self.claim_status,
            'paid_amount': float(self.paid_amount) if self.paid_amount else None,
            'patient_responsibility': float(self.patient_responsibility) if self.patient_responsibility else None,
            'adjustment_amount': float(self.adjustment_amount) if self.adjustment_amount else None,
            'denial_code': self.denial_code,
            'denial_reason': self.denial_reason,
            'service_date_from': self.service_date_from.isoformat() if self.service_date_from else None,
            'service_date_to': self.service_date_to.isoformat() if self.service_date_to else None,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

