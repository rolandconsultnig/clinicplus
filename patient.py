from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from src.models.user import db

class Patient(db.Model):
    __tablename__ = 'patients'
    
    id = db.Column(db.Integer, primary_key=True)
    # Universal patient identifier across all facilities
    universal_patient_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Demographics
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    middle_name = db.Column(db.String(100))
    date_of_birth = db.Column(db.Date, nullable=False)
    gender = db.Column(db.String(20))
    ssn = db.Column(db.String(11))  # Encrypted
    
    # Contact Information
    phone_primary = db.Column(db.String(20))
    phone_secondary = db.Column(db.String(20))
    email = db.Column(db.String(120))
    
    # Address
    address_line1 = db.Column(db.String(200))
    address_line2 = db.Column(db.String(200))
    city = db.Column(db.String(100))
    state = db.Column(db.String(50))
    zip_code = db.Column(db.String(10))
    country = db.Column(db.String(50), default='USA')
    
    # Emergency Contact
    emergency_contact_name = db.Column(db.String(200))
    emergency_contact_phone = db.Column(db.String(20))
    emergency_contact_relationship = db.Column(db.String(50))
    
    # Insurance Information
    insurance_provider = db.Column(db.String(100))
    insurance_policy_number = db.Column(db.String(50))
    insurance_group_number = db.Column(db.String(50))
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Privacy Preferences
    allow_cross_facility_sharing = db.Column(db.Boolean, default=False)
    data_sharing_preferences = db.Column(db.Text)  # JSON string
    
    # Relationships
    medical_history = db.relationship('MedicalHistory', backref='patient', lazy=True)
    allergies = db.relationship('Allergy', backref='patient', lazy=True)
    medications = db.relationship('Medication', backref='patient', lazy=True)
    encounters = db.relationship('ClinicalEncounter', backref='patient', lazy=True)
    lab_results = db.relationship('LabResult', backref='patient', lazy=True)
    
    def __repr__(self):
        return f'<Patient {self.first_name} {self.last_name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'universal_patient_id': self.universal_patient_id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'middle_name': self.middle_name,
            'date_of_birth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'gender': self.gender,
            'phone_primary': self.phone_primary,
            'email': self.email,
            'address_line1': self.address_line1,
            'city': self.city,
            'state': self.state,
            'zip_code': self.zip_code,
            'emergency_contact_name': self.emergency_contact_name,
            'emergency_contact_phone': self.emergency_contact_phone,
            'insurance_provider': self.insurance_provider,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_active': self.is_active,
            'allow_cross_facility_sharing': self.allow_cross_facility_sharing
        }

class MedicalHistory(db.Model):
    __tablename__ = 'medical_history'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    
    condition_name = db.Column(db.String(200), nullable=False)
    condition_code = db.Column(db.String(20))  # ICD-10 code
    diagnosis_date = db.Column(db.Date)
    status = db.Column(db.String(50))  # active, resolved, chronic
    severity = db.Column(db.String(20))  # mild, moderate, severe
    notes = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('providers.id'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'condition_name': self.condition_name,
            'condition_code': self.condition_code,
            'diagnosis_date': self.diagnosis_date.isoformat() if self.diagnosis_date else None,
            'status': self.status,
            'severity': self.severity,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Allergy(db.Model):
    __tablename__ = 'allergies'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    
    allergen = db.Column(db.String(200), nullable=False)
    allergen_type = db.Column(db.String(50))  # drug, food, environmental
    reaction = db.Column(db.String(500))
    severity = db.Column(db.String(20))  # mild, moderate, severe, life-threatening
    onset_date = db.Column(db.Date)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('providers.id'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'allergen': self.allergen,
            'allergen_type': self.allergen_type,
            'reaction': self.reaction,
            'severity': self.severity,
            'onset_date': self.onset_date.isoformat() if self.onset_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Medication(db.Model):
    __tablename__ = 'medications'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    
    medication_name = db.Column(db.String(200), nullable=False)
    generic_name = db.Column(db.String(200))
    dosage = db.Column(db.String(100))
    frequency = db.Column(db.String(100))
    route = db.Column(db.String(50))  # oral, injection, topical, etc.
    
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    status = db.Column(db.String(50))  # active, discontinued, completed
    
    prescribing_provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'))
    pharmacy_name = db.Column(db.String(200))
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'medication_name': self.medication_name,
            'generic_name': self.generic_name,
            'dosage': self.dosage,
            'frequency': self.frequency,
            'route': self.route,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'status': self.status,
            'pharmacy_name': self.pharmacy_name,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

