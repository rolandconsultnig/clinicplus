"""
Provider and Facility Models
"""
from datetime import datetime
from src.models.user import db

class Provider(db.Model):
    __tablename__ = 'providers'
    
    id = db.Column(db.Integer, primary_key=True)
    # Universal provider identifier across all facilities
    universal_provider_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # User account association
    user_account_id = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    
    # Personal Information
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    middle_name = db.Column(db.String(100))
    title = db.Column(db.String(50))  # Dr., RN, PharmD, etc.
    
    # Professional Information
    provider_type = db.Column(db.String(50), nullable=False)  # physician, nurse, pharmacist, lab_tech, radiographer
    specialty = db.Column(db.String(100))
    sub_specialty = db.Column(db.String(100))
    
    # Credentials
    medical_license_number = db.Column(db.String(50))
    license_number = db.Column(db.String(50))  # Alias
    medical_license_state = db.Column(db.String(50))
    medical_license_expiry = db.Column(db.Date)
    
    dea_number = db.Column(db.String(20))  # For prescribing controlled substances
    npi_number = db.Column(db.String(20))  # National Provider Identifier
    
    # Board Certifications
    board_certifications = db.Column(db.Text)  # JSON string for multiple certifications
    
    # Contact Information
    phone = db.Column(db.String(20))
    email = db.Column(db.String(120))
    
    # Employment Information
    employment_status = db.Column(db.String(50), default='active')  # active, inactive, suspended
    hire_date = db.Column(db.Date)
    termination_date = db.Column(db.Date)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    facility_affiliations = db.relationship('ProviderFacility', backref='provider', lazy=True)
    encounters = db.relationship('ClinicalEncounter', backref='provider', lazy=True)
    prescriptions = db.relationship('Medication', backref='prescribing_provider_rel', lazy=True, foreign_keys='Medication.prescribing_provider_id')
    
    def __repr__(self):
        return f'<Provider {self.title} {self.first_name} {self.last_name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'universal_provider_id': self.universal_provider_id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'middle_name': self.middle_name,
            'title': self.title,
            'provider_type': self.provider_type,
            'specialty': self.specialty,
            'sub_specialty': self.sub_specialty,
            'medical_license_number': self.medical_license_number or self.license_number,
            'license_number': self.license_number or self.medical_license_number,
            'medical_license_state': self.medical_license_state,
            'medical_license_expiry': self.medical_license_expiry.isoformat() if self.medical_license_expiry else None,
            'npi_number': self.npi_number,
            'phone': self.phone,
            'email': self.email,
            'employment_status': self.employment_status,
            'hire_date': self.hire_date.isoformat() if self.hire_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_active': self.is_active
        }

class Facility(db.Model):
    __tablename__ = 'facilities'
    
    id = db.Column(db.Integer, primary_key=True)
    # Unique facility identifier
    facility_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Facility Information
    facility_name = db.Column(db.String(200), nullable=False)
    facility_type = db.Column(db.String(50), nullable=False)  # hospital, clinic, pharmacy, lab, imaging_center
    
    # Address
    address_line1 = db.Column(db.String(200))
    address_line2 = db.Column(db.String(200))
    city = db.Column(db.String(100))
    state = db.Column(db.String(50))
    zip_code = db.Column(db.String(10))
    country = db.Column(db.String(50), default='Nigeria')
    
    # Contact Information
    phone = db.Column(db.String(20))
    fax = db.Column(db.String(20))
    email = db.Column(db.String(120))
    website = db.Column(db.String(200))
    
    # Accreditation and Licensing
    license_number = db.Column(db.String(50))
    accreditation_body = db.Column(db.String(100))
    accreditation_status = db.Column(db.String(50))
    accreditation_expiry = db.Column(db.Date)
    
    # Operational Information
    operating_hours = db.Column(db.Text)  # JSON string
    services_offered = db.Column(db.Text)  # JSON string
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Tenant Configuration
    tenant_database_name = db.Column(db.String(100))  # For multi-tenant architecture
    tenant_config = db.Column(db.Text)  # JSON string for facility-specific configurations
    
    # Organization Association
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=True)
    
    # Relationships
    provider_affiliations = db.relationship('ProviderFacility', backref='facility', lazy=True)
    encounters = db.relationship('ClinicalEncounter', backref='facility', lazy=True)
    
    def __repr__(self):
        return f'<Facility {self.facility_name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'facility_id': self.facility_id,
            'facility_name': self.facility_name,
            'facility_type': self.facility_type,
            'address_line1': self.address_line1,
            'city': self.city,
            'state': self.state,
            'zip_code': self.zip_code,
            'phone': self.phone,
            'email': self.email,
            'website': self.website,
            'license_number': self.license_number,
            'accreditation_status': self.accreditation_status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_active': self.is_active
        }

class ProviderFacility(db.Model):
    __tablename__ = 'provider_facilities'
    
    id = db.Column(db.Integer, primary_key=True)
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=False)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    
    # Relationship Details
    role = db.Column(db.String(100))  # attending, resident, consultant, etc.
    department = db.Column(db.String(100))
    privileges = db.Column(db.Text)  # JSON string for specific privileges
    
    # Dates
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    is_primary_facility = db.Column(db.Boolean, default=False)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'provider_id': self.provider_id,
            'facility_id': self.facility_id,
            'role': self.role,
            'department': self.department,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'is_primary_facility': self.is_primary_facility,
            'is_active': self.is_active
        }

