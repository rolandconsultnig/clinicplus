"""
Clinic+Pad2e Emergency Response Models
"""
from datetime import datetime
from src.models.user import db

class EmergencyAccess(db.Model):
    __tablename__ = 'emergency_accesses'
    
    id = db.Column(db.Integer, primary_key=True)
    access_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Patient Identification
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=True)
    clinic_plus_id = db.Column(db.String(50), index=True)  # Universal patient ID
    identification_method = db.Column(db.String(50), nullable=False)  # fingerprint, qr_code, rfid, manual
    
    # Emergency Context
    emergency_type = db.Column(db.String(50))  # accident, medical_emergency, trauma
    incident_location = db.Column(db.String(200))
    incident_latitude = db.Column(db.Float)
    incident_longitude = db.Column(db.Float)
    
    # First Responder
    responder_id = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    responder_name = db.Column(db.String(200))
    responder_type = db.Column(db.String(50))  # ems, paramedic, first_aid, hospital_staff
    device_id = db.Column(db.String(100))  # Clinic+Pad2e device identifier
    
    # Access Details
    accessed_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    data_accessed = db.Column(db.Text)  # JSON string of what data was viewed
    
    # Hospital Handoff
    destination_facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=True)
    handoff_sent = db.Column(db.Boolean, default=False)
    handoff_sent_at = db.Column(db.DateTime)
    estimated_arrival_time = db.Column(db.DateTime)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'access_id': self.access_id,
            'patient_id': self.patient_id,
            'clinic_plus_id': self.clinic_plus_id,
            'identification_method': self.identification_method,
            'emergency_type': self.emergency_type,
            'incident_location': self.incident_location,
            'responder_type': self.responder_type,
            'accessed_at': self.accessed_at.isoformat() if self.accessed_at else None,
            'handoff_sent': self.handoff_sent,
            'destination_facility_id': self.destination_facility_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class EmergencyDataView(db.Model):
    __tablename__ = 'emergency_data_views'
    
    id = db.Column(db.Integer, primary_key=True)
    emergency_access_id = db.Column(db.Integer, db.ForeignKey('emergency_accesses.id'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    
    # Data Categories Viewed
    blood_group = db.Column(db.Boolean, default=False)
    genotype = db.Column(db.Boolean, default=False)
    allergies = db.Column(db.Boolean, default=False)
    current_medications = db.Column(db.Boolean, default=False)
    medical_history = db.Column(db.Boolean, default=False)
    emergency_contacts = db.Column(db.Boolean, default=False)
    
    # View Timestamp
    viewed_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'emergency_access_id': self.emergency_access_id,
            'patient_id': self.patient_id,
            'blood_group': self.blood_group,
            'genotype': self.genotype,
            'allergies': self.allergies,
            'current_medications': self.current_medications,
            'viewed_at': self.viewed_at.isoformat() if self.viewed_at else None
        }

class HospitalHandoff(db.Model):
    __tablename__ = 'hospital_handoffs'
    
    id = db.Column(db.Integer, primary_key=True)
    handoff_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Emergency Access
    emergency_access_id = db.Column(db.Integer, db.ForeignKey('emergency_accesses.id'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    
    # Source and Destination
    source_facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=True)
    destination_facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    
    # Handoff Details
    patient_condition = db.Column(db.Text)  # Current condition description
    vital_signs_summary = db.Column(db.Text)  # JSON string
    interventions_provided = db.Column(db.Text)  # JSON string
    medications_given = db.Column(db.Text)  # JSON string
    
    # Timing
    incident_time = db.Column(db.DateTime)
    dispatch_time = db.Column(db.DateTime)
    estimated_arrival_time = db.Column(db.DateTime, nullable=False)
    actual_arrival_time = db.Column(db.DateTime)
    
    # Status
    status = db.Column(db.String(50), default='pending')  # pending, sent, acknowledged, arrived, completed
    sent_at = db.Column(db.DateTime)
    acknowledged_at = db.Column(db.DateTime)
    acknowledged_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'handoff_id': self.handoff_id,
            'emergency_access_id': self.emergency_access_id,
            'patient_id': self.patient_id,
            'destination_facility_id': self.destination_facility_id,
            'patient_condition': self.patient_condition,
            'estimated_arrival_time': self.estimated_arrival_time.isoformat() if self.estimated_arrival_time else None,
            'actual_arrival_time': self.actual_arrival_time.isoformat() if self.actual_arrival_time else None,
            'status': self.status,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class EMSDevice(db.Model):
    __tablename__ = 'ems_devices'
    
    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    device_serial_number = db.Column(db.String(100), unique=True, nullable=False)
    
    # Assignment
    assigned_to = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=True)
    
    # Device Details
    device_type = db.Column(db.String(50), default='clinicpad2e')
    device_model = db.Column(db.String(100))
    firmware_version = db.Column(db.String(50))
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    is_online = db.Column(db.Boolean, default=False)
    last_seen = db.Column(db.DateTime)
    battery_level = db.Column(db.Integer)  # 0-100
    
    # Location
    current_latitude = db.Column(db.Float)
    current_longitude = db.Column(db.Float)
    location_updated_at = db.Column(db.DateTime)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    # Note: EmergencyAccess has device_id as string, not FK, so relationship removed
    # emergency_accesses = db.relationship('EmergencyAccess', backref='ems_device', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'device_id': self.device_id,
            'device_serial_number': self.device_serial_number,
            'assigned_to': self.assigned_to,
            'facility_id': self.facility_id,
            'device_type': self.device_type,
            'is_active': self.is_active,
            'is_online': self.is_online,
            'last_seen': self.last_seen.isoformat() if self.last_seen else None,
            'battery_level': self.battery_level,
            'current_latitude': self.current_latitude,
            'current_longitude': self.current_longitude,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

