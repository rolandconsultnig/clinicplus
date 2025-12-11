"""
Patient and Medical Data Models - Enhanced with OpenEMR fields
"""
from datetime import datetime
from src.models.user import db
import uuid

class Patient(db.Model):
    __tablename__ = 'patients'
    
    id = db.Column(db.Integer, primary_key=True)
    # Universal patient identifier across all facilities
    universal_patient_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    uuid = db.Column(db.String(36), unique=True, default=lambda: str(uuid.uuid4()))
    
    # Basic Demographics
    title = db.Column(db.String(255), default='')  # Mr, Mrs, Dr, etc.
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    middle_name = db.Column(db.String(100))
    suffix = db.Column(db.String(50))  # Jr, Sr, III, etc.
    date_of_birth = db.Column(db.Date, nullable=False)
    gender = db.Column(db.String(20))  # sex field in OpenEMR
    gender_identity = db.Column(db.Text)  # Gender identity
    sexual_orientation = db.Column(db.Text)
    
    # Name History (for tracking name changes)
    name_history = db.Column(db.Text)  # JSON array of previous names
    birth_fname = db.Column(db.Text)  # Birth first name
    birth_lname = db.Column(db.Text)  # Birth last name
    birth_mname = db.Column(db.Text)  # Birth middle name
    
    # Identification
    ssn = db.Column(db.String(11))  # Encrypted
    nin = db.Column(db.String(11))  # National Identification Number
    drivers_license = db.Column(db.String(255))
    pubpid = db.Column(db.String(255))  # Public patient ID
    
    # Contact Information
    phone_home = db.Column(db.String(20))
    phone_biz = db.Column(db.String(20))  # Business phone
    phone_contact = db.Column(db.String(20))  # Contact phone
    phone_cell = db.Column(db.String(20))  # Cell phone
    email = db.Column(db.String(120))
    email_direct = db.Column(db.String(120))  # Direct email
    
    # Address
    address_line1 = db.Column(db.String(200))  # street
    address_line2 = db.Column(db.String(200))  # street_line_2
    city = db.Column(db.String(100))
    state = db.Column(db.String(50))
    zip_code = db.Column(db.String(10))  # postal_code
    country = db.Column(db.String(50), default='Nigeria')  # country_code
    county = db.Column(db.String(40))
    
    # Emergency Contact
    emergency_contact_name = db.Column(db.String(200))
    emergency_contact_phone = db.Column(db.String(20))
    emergency_contact_relationship = db.Column(db.String(50))  # contact_relationship
    
    # Guardian Information (for minors)
    guardiansname = db.Column(db.Text)
    guardianrelationship = db.Column(db.Text)
    guardiansex = db.Column(db.Text)
    guardianaddress = db.Column(db.Text)
    guardiancity = db.Column(db.Text)
    guardianstate = db.Column(db.Text)
    guardianpostalcode = db.Column(db.Text)
    guardiancountry = db.Column(db.Text)
    guardianphone = db.Column(db.Text)
    guardianworkphone = db.Column(db.Text)
    guardianemail = db.Column(db.Text)
    mothersname = db.Column(db.String(255))
    
    # Insurance Information
    insurance_provider = db.Column(db.String(100))
    insurance_policy_number = db.Column(db.String(50))
    insurance_group_number = db.Column(db.String(50))
    financial = db.Column(db.String(255))  # Financial class
    pricelevel = db.Column(db.String(255), default='standard')
    
    # Employment & Socioeconomic
    occupation = db.Column(db.Text)
    industry = db.Column(db.Text)
    employer_name = db.Column(db.String(255))
    employer_address = db.Column(db.Text)
    employer_city = db.Column(db.String(100))
    employer_state = db.Column(db.String(50))
    employer_zip = db.Column(db.String(10))
    employer_phone = db.Column(db.String(20))
    monthly_income = db.Column(db.String(255))
    family_size = db.Column(db.String(255))
    homeless = db.Column(db.String(255))
    migrantseasonal = db.Column(db.String(255))
    
    # Demographics
    language = db.Column(db.String(255), default='')
    ethnoracial = db.Column(db.String(255))
    race = db.Column(db.String(255))
    ethnicity = db.Column(db.String(255))
    religion = db.Column(db.String(40))
    interpretter = db.Column(db.String(255))
    
    # Provider & Referral
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=True)  # providerID
    ref_provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=True)  # ref_providerID
    referrer = db.Column(db.String(255))
    referrer_id = db.Column(db.String(255))  # referrerID
    referral_source = db.Column(db.String(30))
    provider_since_date = db.Column(db.String(255))
    
    # Pharmacy
    pharmacy_id = db.Column(db.Integer, default=0)
    
    # Status & Dates
    status = db.Column(db.String(255), default='')
    regdate = db.Column(db.DateTime)  # Registration date
    deceased_date = db.Column(db.DateTime)
    deceased_reason = db.Column(db.String(255))
    financial_review = db.Column(db.DateTime)
    
    # Facility and User Association
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=True)
    user_account_id = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    
    # HIPAA & Privacy
    hipaa_mail = db.Column(db.String(3), default='')
    hipaa_voice = db.Column(db.String(3), default='')
    hipaa_notice = db.Column(db.String(3), default='')
    hipaa_message = db.Column(db.String(20), default='')
    hipaa_allowsms = db.Column(db.String(3), default='NO')
    hipaa_allowemail = db.Column(db.String(3), default='NO')
    allow_patient_portal = db.Column(db.String(31), default='')
    prevent_portal_apps = db.Column(db.Text)
    
    # Immunization Registry
    vfc = db.Column(db.String(255))  # Vaccines for Children
    allow_imm_reg_use = db.Column(db.String(255))
    allow_imm_info_share = db.Column(db.String(255))
    allow_health_info_ex = db.Column(db.String(255))
    imm_reg_status = db.Column(db.Text)
    imm_reg_stat_effdate = db.Column(db.Text)
    publicity_code = db.Column(db.Text)
    publ_code_eff_date = db.Column(db.Text)
    protect_indicator = db.Column(db.Text)
    prot_indi_effdate = db.Column(db.Text)
    
    # Advanced Directives
    completed_ad = db.Column(db.String(3), default='NO')  # Advanced directive completed
    ad_reviewed = db.Column(db.Date)  # Advanced directive reviewed date
    
    # Contraceptives
    contrastart = db.Column(db.Date)  # Date contraceptives initially used
    
    # Care Team
    care_team_provider = db.Column(db.Text)  # JSON array
    care_team_facility = db.Column(db.Text)  # JSON array
    care_team_status = db.Column(db.Text)  # JSON array
    
    # Patient Groups
    patient_groups = db.Column(db.Text)  # JSON array
    squad = db.Column(db.String(32))
    
    # Fitness & Other
    fitness = db.Column(db.Integer, default=0)
    billing_note = db.Column(db.Text)
    
    # Custom Fields (OpenEMR usertext1-8, userlist1-7)
    usertext1 = db.Column(db.String(255))
    usertext2 = db.Column(db.String(255))
    usertext3 = db.Column(db.String(255))
    usertext4 = db.Column(db.String(255))
    usertext5 = db.Column(db.String(255))
    usertext6 = db.Column(db.String(255))
    usertext7 = db.Column(db.String(255))
    usertext8 = db.Column(db.String(255))
    userlist1 = db.Column(db.String(255))
    userlist2 = db.Column(db.String(255))
    userlist3 = db.Column(db.String(255))
    userlist4 = db.Column(db.String(255))
    userlist5 = db.Column(db.String(255))
    userlist6 = db.Column(db.String(255))
    userlist7 = db.Column(db.String(255))
    genericname1 = db.Column(db.String(255))
    genericval1 = db.Column(db.String(255))
    genericname2 = db.Column(db.String(255))
    genericval2 = db.Column(db.String(255))
    
    # SOAP Import Status
    soap_import_status = db.Column(db.Integer)  # 1-Prescription Press, 2-Prescription Import, etc.
    
    # CMS Portal
    cmsportal_login = db.Column(db.String(60))
    
    # Duplicate Detection
    dupscore = db.Column(db.Integer, default=-9)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    updated_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
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
            'facility_id': self.facility_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_active': self.is_active,
            'allow_cross_facility_sharing': self.allow_cross_facility_sharing
        }

class MedicalHistory(db.Model):
    __tablename__ = 'medical_history'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    
    condition = db.Column(db.String(200), nullable=False)  # Also supports condition_name
    condition_name = db.Column(db.String(200))  # Alias for condition
    condition_code = db.Column(db.String(20))  # ICD-10 code
    diagnosis_date = db.Column(db.Date)
    status = db.Column(db.String(50), default='active')  # active, resolved, chronic
    severity = db.Column(db.String(20))  # mild, moderate, severe
    notes = db.Column(db.Text)
    
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    diagnosed_by = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'condition': self.condition or self.condition_name,
            'condition_name': self.condition_name or self.condition,
            'condition_code': self.condition_code,
            'diagnosis_date': self.diagnosis_date.isoformat() if self.diagnosis_date else None,
            'status': self.status,
            'severity': self.severity,
            'notes': self.notes,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Allergy(db.Model):
    __tablename__ = 'allergies'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    
    allergen = db.Column(db.String(200), nullable=False)
    allergen_type = db.Column(db.String(50))  # drug, food, environmental
    reaction = db.Column(db.String(500))
    severity = db.Column(db.String(20), default='moderate')  # mild, moderate, severe, life-threatening
    onset_date = db.Column(db.Date)
    notes = db.Column(db.Text)
    
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    recorded_by = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'allergen': self.allergen,
            'allergen_type': self.allergen_type,
            'reaction': self.reaction,
            'severity': self.severity,
            'onset_date': self.onset_date.isoformat() if self.onset_date else None,
            'notes': self.notes,
            'is_active': self.is_active,
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
    route = db.Column(db.String(50), default='oral')  # oral, injection, topical, etc.
    
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    status = db.Column(db.String(50), default='active')  # active, discontinued, completed
    is_active = db.Column(db.Boolean, default=True)
    
    prescribing_provider = db.Column(db.String(200))  # Provider name as string
    prescribing_provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=True)
    pharmacy_name = db.Column(db.String(200))
    
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    prescribed_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    updated_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    
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
            'is_active': self.is_active,
            'prescribing_provider': self.prescribing_provider,
            'pharmacy_name': self.pharmacy_name,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class PatientHistory(db.Model):
    """Patient history tracking for name changes and demographic updates"""
    __tablename__ = 'patient_history'
    
    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), unique=True, default=lambda: str(uuid.uuid4()))
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    
    date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    history_type_key = db.Column(db.String(36))  # Type of history entry
    
    # Previous name information
    previous_name_prefix = db.Column(db.Text)
    previous_name_first = db.Column(db.Text)
    previous_name_middle = db.Column(db.Text)
    previous_name_last = db.Column(db.Text)
    previous_name_suffix = db.Column(db.Text)
    previous_name_enddate = db.Column(db.Date)
    
    # Care team history
    care_team_provider = db.Column(db.Text)
    care_team_facility = db.Column(db.Text)
    
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'uuid': self.uuid,
            'patient_id': self.patient_id,
            'date': self.date.isoformat() if self.date else None,
            'history_type_key': self.history_type_key,
            'previous_name_first': self.previous_name_first,
            'previous_name_last': self.previous_name_last,
            'previous_name_enddate': self.previous_name_enddate.isoformat() if self.previous_name_enddate else None,
            'created_by': self.created_by
        }

class PatientPhoto(db.Model):
    """Patient photo/document storage"""
    __tablename__ = 'patient_photos'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    document_id = db.Column(db.Integer, db.ForeignKey('documents.id'), nullable=True)
    photo_url = db.Column(db.String(500))
    is_primary = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'document_id': self.document_id,
            'photo_url': self.photo_url,
            'is_primary': self.is_primary,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

