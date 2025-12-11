"""
UB-04 Forms Models for Clinic+
Hospital billing forms (UB-04)
"""

from datetime import datetime
from src.models.user import db

class UB04Form(db.Model):
    __tablename__ = 'ub04_forms'
    
    id = db.Column(db.Integer, primary_key=True)
    form_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Form Information
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    encounter_id = db.Column(db.Integer, db.ForeignKey('clinical_encounters.id'), nullable=True)
    
    # UB-04 Form Fields
    # Patient Information (FL 1-9)
    statement_covers_period_from = db.Column(db.Date)
    statement_covers_period_to = db.Column(db.Date)
    patient_name = db.Column(db.String(200))
    patient_address = db.Column(db.Text)
    patient_city = db.Column(db.String(100))
    patient_state = db.Column(db.String(50))
    patient_zip = db.Column(db.String(20))
    patient_dob = db.Column(db.Date)
    patient_sex = db.Column(db.String(10))
    
    # Provider Information (FL 10-17)
    provider_name = db.Column(db.String(200))
    provider_npi = db.Column(db.String(20))
    provider_address = db.Column(db.Text)
    provider_city = db.Column(db.String(100))
    provider_state = db.Column(db.String(50))
    provider_zip = db.Column(db.String(20))
    provider_tax_id = db.Column(db.String(50))
    
    # Billing Information (FL 18-28)
    admission_date = db.Column(db.Date)
    admission_hour = db.Column(db.String(10))
    admission_type = db.Column(db.String(10))
    discharge_date = db.Column(db.Date)
    discharge_hour = db.Column(db.String(10))
    patient_status = db.Column(db.String(10))
    
    # Diagnosis Codes (FL 67-75)
    principal_diagnosis_code = db.Column(db.String(20))
    admitting_diagnosis_code = db.Column(db.String(20))
    other_diagnosis_codes = db.Column(db.Text)  # JSON array
    
    # Procedure Codes (FL 74-80)
    procedure_codes = db.Column(db.Text)  # JSON array
    
    # Revenue Codes (FL 42-49)
    revenue_codes = db.Column(db.Text)  # JSON array with charges
    
    # Insurance Information (FL 50-64)
    primary_insurance_name = db.Column(db.String(200))
    primary_insurance_policy_number = db.Column(db.String(50))
    primary_insurance_group_number = db.Column(db.String(50))
    
    # Charges
    total_charges = db.Column(db.Numeric(10, 2))
    
    # Status
    status = db.Column(db.String(50), default='draft')  # draft, submitted, accepted, rejected
    submitted_at = db.Column(db.DateTime)
    submitted_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    patient = db.relationship('Patient', backref='ub04_forms')
    facility = db.relationship('Facility', backref='ub04_forms')
    encounter = db.relationship('ClinicalEncounter', backref='ub04_forms')
    
    def to_dict(self):
        return {
            'id': self.id,
            'form_id': self.form_id,
            'patient_id': self.patient_id,
            'facility_id': self.facility_id,
            'encounter_id': self.encounter_id,
            'statement_covers_period_from': self.statement_covers_period_from.isoformat() if self.statement_covers_period_from else None,
            'statement_covers_period_to': self.statement_covers_period_to.isoformat() if self.statement_covers_period_to else None,
            'patient_name': self.patient_name,
            'patient_address': self.patient_address,
            'admission_date': self.admission_date.isoformat() if self.admission_date else None,
            'discharge_date': self.discharge_date.isoformat() if self.discharge_date else None,
            'principal_diagnosis_code': self.principal_diagnosis_code,
            'procedure_codes': self.procedure_codes,
            'revenue_codes': self.revenue_codes,
            'total_charges': float(self.total_charges) if self.total_charges else None,
            'status': self.status,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'submitted_by': self.submitted_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by': self.created_by,
            'is_active': self.is_active
        }

