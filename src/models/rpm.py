"""
Remote Patient Monitoring (PulseGuard) Models
"""
from datetime import datetime
from src.models.user import db

class RPMDevice(db.Model):
    __tablename__ = 'rpm_devices'
    
    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    device_serial_number = db.Column(db.String(100), unique=True, nullable=False)
    
    # Patient Assignment
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    
    # Device Details
    device_type = db.Column(db.String(50), default='pulseguard')  # pulseguard, other
    device_model = db.Column(db.String(100))
    firmware_version = db.Column(db.String(50))
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    is_paired = db.Column(db.Boolean, default=False)
    paired_at = db.Column(db.DateTime)
    last_sync = db.Column(db.DateTime)
    
    # Battery
    battery_level = db.Column(db.Integer)  # 0-100
    battery_status = db.Column(db.String(20))  # charging, discharging, full, low
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    vital_readings = db.relationship('RPMVitalReading', backref='device', lazy=True)
    alerts = db.relationship('RPMAlert', backref='device', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'device_id': self.device_id,
            'device_serial_number': self.device_serial_number,
            'patient_id': self.patient_id,
            'device_type': self.device_type,
            'is_active': self.is_active,
            'is_paired': self.is_paired,
            'last_sync': self.last_sync.isoformat() if self.last_sync else None,
            'battery_level': self.battery_level,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class RPMVitalReading(db.Model):
    __tablename__ = 'rpm_vital_readings'
    
    id = db.Column(db.Integer, primary_key=True)
    reading_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Device and Patient
    device_id = db.Column(db.Integer, db.ForeignKey('rpm_devices.id'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    
    # Vital Signs
    systolic_bp = db.Column(db.Integer)  # mmHg
    diastolic_bp = db.Column(db.Integer)  # mmHg
    heart_rate = db.Column(db.Integer)  # bpm
    oxygen_saturation = db.Column(db.Float)  # percentage
    
    # Measurement Details
    measurement_method = db.Column(db.String(50), default='cuffless')  # cuffless, cuff, manual
    measurement_timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    device_timestamp = db.Column(db.DateTime)  # Timestamp from device
    
    # Quality Indicators
    signal_quality = db.Column(db.String(20))  # excellent, good, fair, poor
    measurement_valid = db.Column(db.Boolean, default=True)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    synced_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'reading_id': self.reading_id,
            'device_id': self.device_id,
            'patient_id': self.patient_id,
            'systolic_bp': self.systolic_bp,
            'diastolic_bp': self.diastolic_bp,
            'heart_rate': self.heart_rate,
            'oxygen_saturation': self.oxygen_saturation,
            'measurement_timestamp': self.measurement_timestamp.isoformat() if self.measurement_timestamp else None,
            'signal_quality': self.signal_quality,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class RPMAlert(db.Model):
    __tablename__ = 'rpm_alerts'
    
    id = db.Column(db.Integer, primary_key=True)
    alert_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Device and Patient
    device_id = db.Column(db.Integer, db.ForeignKey('rpm_devices.id'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    reading_id = db.Column(db.Integer, db.ForeignKey('rpm_vital_readings.id'), nullable=True)
    
    # Alert Details
    alert_level = db.Column(db.Integer, nullable=False)  # 1=info, 2=critical, 3=emergency
    alert_type = db.Column(db.String(50), nullable=False)  # bp_high, bp_low, heart_rate_abnormal, device_offline
    alert_message = db.Column(db.Text, nullable=False)
    
    # Vital Values that Triggered Alert
    trigger_systolic_bp = db.Column(db.Integer)
    trigger_diastolic_bp = db.Column(db.Integer)
    trigger_heart_rate = db.Column(db.Integer)
    
    # Thresholds
    threshold_min = db.Column(db.Integer)
    threshold_max = db.Column(db.Integer)
    
    # Status
    status = db.Column(db.String(50), default='active')  # active, acknowledged, resolved, escalated
    acknowledged_at = db.Column(db.DateTime)
    acknowledged_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    resolved_at = db.Column(db.DateTime)
    resolved_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    
    # Escalation
    escalated_to_level = db.Column(db.Integer)  # 2 or 3
    escalated_at = db.Column(db.DateTime)
    emergency_contacts_notified = db.Column(db.Boolean, default=False)
    emergency_response_dispatched = db.Column(db.Boolean, default=False)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'alert_id': self.alert_id,
            'device_id': self.device_id,
            'patient_id': self.patient_id,
            'alert_level': self.alert_level,
            'alert_type': self.alert_type,
            'alert_message': self.alert_message,
            'status': self.status,
            'acknowledged_at': self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'emergency_contacts_notified': self.emergency_contacts_notified,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class RPMAlertRule(db.Model):
    __tablename__ = 'rpm_alert_rules'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    
    # Rule Configuration
    vital_type = db.Column(db.String(50), nullable=False)  # systolic_bp, diastolic_bp, heart_rate, oxygen_saturation
    threshold_min = db.Column(db.Integer)
    threshold_max = db.Column(db.Integer)
    alert_level = db.Column(db.Integer, default=2)  # 1, 2, or 3
    
    # Notification Settings
    notify_provider = db.Column(db.Boolean, default=True)
    notify_emergency_contacts = db.Column(db.Boolean, default=False)
    notify_emergency_response = db.Column(db.Boolean, default=False)
    
    # Provider Assignment
    assigned_provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=True)
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'vital_type': self.vital_type,
            'threshold_min': self.threshold_min,
            'threshold_max': self.threshold_max,
            'alert_level': self.alert_level,
            'notify_provider': self.notify_provider,
            'notify_emergency_contacts': self.notify_emergency_contacts,
            'is_active': self.is_active
        }

class TelehealthSession(db.Model):
    __tablename__ = 'telehealth_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Patient and Provider
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=False)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    
    # Session Details
    session_type = db.Column(db.String(50), default='video')  # video, audio, chat
    platform = db.Column(db.String(50))  # zoom, comlink, custom
    meeting_url = db.Column(db.String(500))
    meeting_id = db.Column(db.String(100))
    
    # Scheduling
    scheduled_start = db.Column(db.DateTime, nullable=False)
    scheduled_end = db.Column(db.DateTime)
    actual_start = db.Column(db.DateTime)
    actual_end = db.Column(db.DateTime)
    duration_minutes = db.Column(db.Integer)
    
    # Status
    status = db.Column(db.String(50), default='scheduled')  # scheduled, in_progress, completed, cancelled, no_show
    
    # Encounter Link
    encounter_id = db.Column(db.Integer, db.ForeignKey('clinical_encounters.id'), nullable=True)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'session_id': self.session_id,
            'patient_id': self.patient_id,
            'provider_id': self.provider_id,
            'session_type': self.session_type,
            'platform': self.platform,
            'scheduled_start': self.scheduled_start.isoformat() if self.scheduled_start else None,
            'actual_start': self.actual_start.isoformat() if self.actual_start else None,
            'status': self.status,
            'duration_minutes': self.duration_minutes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

