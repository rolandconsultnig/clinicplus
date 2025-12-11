"""
Insurance Company Model for Clinic+
External insurance companies (payers)
"""

from datetime import datetime
from src.models.user import db

class InsuranceCompany(db.Model):
    __tablename__ = 'insurance_companies'
    
    id = db.Column(db.Integer, primary_key=True)
    company_name = db.Column(db.String(200), nullable=False)
    tax_id = db.Column(db.String(50))
    npi = db.Column(db.String(20))
    
    # Contact Information
    address = db.Column(db.Text)
    city = db.Column(db.String(100))
    state = db.Column(db.String(50))
    zip_code = db.Column(db.String(20))
    phone = db.Column(db.String(50))
    fax = db.Column(db.String(50))
    email = db.Column(db.String(200))
    
    # EDI Information
    x12_receiver_id = db.Column(db.String(50))
    x12_default_partner_id = db.Column(db.String(50))
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'company_name': self.company_name,
            'tax_id': self.tax_id,
            'npi': self.npi,
            'address': self.address,
            'city': self.city,
            'state': self.state,
            'zip_code': self.zip_code,
            'phone': self.phone,
            'fax': self.fax,
            'email': self.email,
            'x12_receiver_id': self.x12_receiver_id,
            'x12_default_partner_id': self.x12_default_partner_id,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

