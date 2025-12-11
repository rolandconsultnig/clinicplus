"""
ONC Health IT Certification Models
Supports 2015 Edition Criteria and ONC certification requirements
"""
from datetime import datetime, date
from src.models.user import db
from decimal import Decimal
import json

class ONCCertification(db.Model):
    """ONC Health IT Certification Record"""
    __tablename__ = 'onc_certifications'
    
    id = db.Column(db.Integer, primary_key=True)
    certification_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Certification Details
    certification_edition = db.Column(db.String(20), default='2015')  # 2015, 2023
    certification_date = db.Column(db.Date, nullable=False)
    certification_body = db.Column(db.String(200))  # ONC-ACB
    certification_number = db.Column(db.String(100))
    
    # Criteria Met
    criteria_met = db.Column(db.Text)  # JSON array of criteria IDs
    
    # Status
    status = db.Column(db.String(50), default='certified')  # certified, expired, revoked
    expiration_date = db.Column(db.Date)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    criteria_records = db.relationship('ONCCriteriaRecord', backref='certification', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'certification_id': self.certification_id,
            'certification_edition': self.certification_edition,
            'certification_date': self.certification_date.isoformat() if self.certification_date else None,
            'certification_body': self.certification_body,
            'certification_number': self.certification_number,
            'criteria_met': json.loads(self.criteria_met) if self.criteria_met else [],
            'status': self.status,
            'expiration_date': self.expiration_date.isoformat() if self.expiration_date else None
        }

class ONCCriteriaRecord(db.Model):
    """Individual ONC Criteria Record"""
    __tablename__ = 'onc_criteria_records'
    
    id = db.Column(db.Integer, primary_key=True)
    record_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Certification Reference
    certification_id = db.Column(db.Integer, db.ForeignKey('onc_certifications.id'), nullable=False)
    
    # Criteria Details
    criteria_id = db.Column(db.String(50), nullable=False)  # e.g., "170.315(a)(1)"
    criteria_name = db.Column(db.String(200), nullable=False)
    criteria_category = db.Column(db.String(100))  # patient_engagement, care_coordination, etc.
    
    # Compliance Status
    is_met = db.Column(db.Boolean, default=False)
    compliance_evidence = db.Column(db.Text)  # JSON string with evidence
    last_verified_at = db.Column(db.DateTime)
    verified_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'record_id': self.record_id,
            'certification_id': self.certification_id,
            'criteria_id': self.criteria_id,
            'criteria_name': self.criteria_name,
            'criteria_category': self.criteria_category,
            'is_met': self.is_met,
            'compliance_evidence': json.loads(self.compliance_evidence) if self.compliance_evidence else {},
            'last_verified_at': self.last_verified_at.isoformat() if self.last_verified_at else None
        }

class ONCComplianceLog(db.Model):
    """ONC Compliance Activity Log"""
    __tablename__ = 'onc_compliance_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    log_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Activity Details
    activity_type = db.Column(db.String(100), nullable=False)  # criteria_met, criteria_failed, audit, etc.
    criteria_id = db.Column(db.String(50))
    activity_description = db.Column(db.Text)
    
    # User and Context
    performed_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'))
    
    # Result
    result = db.Column(db.String(50))  # pass, fail, warning
    details = db.Column(db.Text)  # JSON string
    
    # System Fields
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'log_id': self.log_id,
            'activity_type': self.activity_type,
            'criteria_id': self.criteria_id,
            'activity_description': self.activity_description,
            'result': self.result,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }

