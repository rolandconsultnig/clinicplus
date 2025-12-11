"""
IoT Vitals and Remote Patient Monitoring Models
Handles vitals data from various sources including IoT devices, smartwatches, and remote monitors
"""
from datetime import datetime
from src.models.user import db

class DeviceRegistration(db.Model):
    """Registered IoT devices and wearables for patients"""
    __tablename__ = 'device_registrations'
    
    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.String(100), unique=True, nullable=False, index=True)
    
    # Patient Association
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    
    # Device Information
    device_type = db.Column(db.String(50), nullable=False)  # smartwatch, bp_monitor, glucose_meter, pulse_oximeter, weight_scale, ecg_monitor, thermometer
    device_manufacturer = db.Column(db.String(100))  # Apple, Fitbit, Omron, etc.
    device_model = db.Column(db.String(100))
    device_serial_number = db.Column(db.String(100))
    
    # Connection Details
    connection_type = db.Column(db.String(50))  # bluetooth, wifi, cellular, api
    api_endpoint = db.Column(db.String(500))  # For cloud-connected devices
    api_key = db.Column(db.String(200))  # Encrypted
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    last_sync = db.Column(db.DateTime)
    battery_level = db.Column(db.Integer)  # Percentage
    signal_strength = db.Column(db.Integer)  # For wireless devices
    
    # Registration
    registered_at = db.Column(db.DateTime, default=datetime.utcnow)
    registered_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'device_id': self.device_id,
            'patient_id': self.patient_id,
            'device_type': self.device_type,
            'device_manufacturer': self.device_manufacturer,
            'device_model': self.device_model,
            'connection_type': self.connection_type,
            'is_active': self.is_active,
            'last_sync': self.last_sync.isoformat() if self.last_sync else None,
            'battery_level': self.battery_level,
            'signal_strength': self.signal_strength,
            'registered_at': self.registered_at.isoformat() if self.registered_at else None
        }

class IoTVitalReading(db.Model):
    """Vital signs readings from IoT devices"""
    __tablename__ = 'iot_vital_readings'
    
    id = db.Column(db.Integer, primary_key=True)
    reading_id = db.Column(db.String(100), unique=True, nullable=False, index=True)
    
    # Patient and Device
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    device_id = db.Column(db.String(100), db.ForeignKey('device_registrations.device_id'))
    
    # Reading Metadata
    reading_timestamp = db.Column(db.DateTime, nullable=False, index=True)
    received_timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    data_source = db.Column(db.String(50))  # device, manual, api, integration
    
    # Vital Signs (all optional as different devices measure different vitals)
    # Cardiovascular
    systolic_bp = db.Column(db.Integer)  # mmHg
    diastolic_bp = db.Column(db.Integer)  # mmHg
    heart_rate = db.Column(db.Integer)  # bpm
    heart_rate_variability = db.Column(db.Float)  # ms
    
    # Respiratory
    respiratory_rate = db.Column(db.Integer)  # breaths per minute
    oxygen_saturation = db.Column(db.Float)  # SpO2 percentage
    
    # Temperature
    temperature = db.Column(db.Float)  # Fahrenheit or Celsius
    temperature_unit = db.Column(db.String(1), default='F')  # F or C
    temperature_location = db.Column(db.String(20))  # oral, axillary, tympanic, temporal
    
    # Body Composition
    weight = db.Column(db.Float)  # lbs or kg
    weight_unit = db.Column(db.String(2), default='lbs')
    height = db.Column(db.Float)  # inches or cm
    height_unit = db.Column(db.String(2), default='in')
    bmi = db.Column(db.Float)
    body_fat_percentage = db.Column(db.Float)
    muscle_mass = db.Column(db.Float)
    
    # Glucose
    blood_glucose = db.Column(db.Float)  # mg/dL
    glucose_context = db.Column(db.String(50))  # fasting, post_meal, random
    
    # Activity (from smartwatches)
    steps = db.Column(db.Integer)
    distance = db.Column(db.Float)  # miles or km
    calories_burned = db.Column(db.Integer)
    active_minutes = db.Column(db.Integer)
    
    # Sleep (from smartwatches)
    sleep_duration = db.Column(db.Integer)  # minutes
    sleep_quality_score = db.Column(db.Float)  # 0-100
    deep_sleep_minutes = db.Column(db.Integer)
    rem_sleep_minutes = db.Column(db.Integer)
    
    # ECG/EKG Data
    ecg_rhythm = db.Column(db.String(50))  # normal, afib, inconclusive
    ecg_file_path = db.Column(db.String(500))  # Path to ECG waveform data
    
    # Data Quality
    data_quality = db.Column(db.String(20), default='good')  # good, fair, poor
    confidence_score = db.Column(db.Float)  # 0-1
    
    # Alerts
    is_abnormal = db.Column(db.Boolean, default=False)
    alert_triggered = db.Column(db.Boolean, default=False)
    alert_type = db.Column(db.String(50))  # critical, warning, info
    alert_message = db.Column(db.Text)
    
    # Location (for context)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    location_name = db.Column(db.String(200))
    
    # Additional Data
    notes = db.Column(db.Text)
    raw_data = db.Column(db.Text)  # JSON string of complete device data
    
    # Verification
    verified_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    verified_at = db.Column(db.DateTime)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'reading_id': self.reading_id,
            'patient_id': self.patient_id,
            'device_id': self.device_id,
            'reading_timestamp': self.reading_timestamp.isoformat() if self.reading_timestamp else None,
            'data_source': self.data_source,
            'systolic_bp': self.systolic_bp,
            'diastolic_bp': self.diastolic_bp,
            'heart_rate': self.heart_rate,
            'heart_rate_variability': self.heart_rate_variability,
            'respiratory_rate': self.respiratory_rate,
            'oxygen_saturation': self.oxygen_saturation,
            'temperature': self.temperature,
            'temperature_unit': self.temperature_unit,
            'weight': self.weight,
            'weight_unit': self.weight_unit,
            'bmi': self.bmi,
            'blood_glucose': self.blood_glucose,
            'glucose_context': self.glucose_context,
            'steps': self.steps,
            'calories_burned': self.calories_burned,
            'sleep_duration': self.sleep_duration,
            'ecg_rhythm': self.ecg_rhythm,
            'is_abnormal': self.is_abnormal,
            'alert_triggered': self.alert_triggered,
            'alert_type': self.alert_type,
            'alert_message': self.alert_message,
            'data_quality': self.data_quality,
            'confidence_score': self.confidence_score
        }

class VitalAlert(db.Model):
    """Alerts triggered by abnormal vital readings"""
    __tablename__ = 'vital_alerts'
    
    id = db.Column(db.Integer, primary_key=True)
    alert_id = db.Column(db.String(100), unique=True, nullable=False, index=True)
    
    # Patient and Reading
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    reading_id = db.Column(db.String(100), db.ForeignKey('iot_vital_readings.reading_id'))
    
    # Alert Details
    alert_type = db.Column(db.String(50), nullable=False)  # critical, warning, info
    alert_category = db.Column(db.String(50))  # bp_high, bp_low, hr_high, hr_low, spo2_low, glucose_high, etc.
    alert_message = db.Column(db.Text, nullable=False)
    severity = db.Column(db.String(20))  # critical, high, medium, low
    
    # Vital Values
    vital_type = db.Column(db.String(50))  # blood_pressure, heart_rate, oxygen_saturation, etc.
    vital_value = db.Column(db.String(50))
    threshold_value = db.Column(db.String(50))
    
    # Status
    status = db.Column(db.String(20), default='active')  # active, acknowledged, resolved, dismissed
    acknowledged_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    acknowledged_at = db.Column(db.DateTime)
    resolved_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    resolved_at = db.Column(db.DateTime)
    resolution_notes = db.Column(db.Text)
    
    # Notification
    notification_sent = db.Column(db.Boolean, default=False)
    notification_method = db.Column(db.String(50))  # sms, email, push, call
    notification_sent_at = db.Column(db.DateTime)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'alert_id': self.alert_id,
            'patient_id': self.patient_id,
            'alert_type': self.alert_type,
            'alert_category': self.alert_category,
            'alert_message': self.alert_message,
            'severity': self.severity,
            'vital_type': self.vital_type,
            'vital_value': self.vital_value,
            'threshold_value': self.threshold_value,
            'status': self.status,
            'acknowledged_by': self.acknowledged_by,
            'acknowledged_at': self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class DeviceSyncLog(db.Model):
    """Log of device synchronization events"""
    __tablename__ = 'device_sync_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.String(100), db.ForeignKey('device_registrations.device_id'), nullable=False)
    
    # Sync Details
    sync_timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    sync_type = db.Column(db.String(50))  # automatic, manual, scheduled
    sync_status = db.Column(db.String(20))  # success, failed, partial
    
    # Data Transfer
    readings_synced = db.Column(db.Integer, default=0)
    data_size = db.Column(db.Integer)  # bytes
    
    # Error Handling
    error_message = db.Column(db.Text)
    retry_count = db.Column(db.Integer, default=0)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'device_id': self.device_id,
            'sync_timestamp': self.sync_timestamp.isoformat() if self.sync_timestamp else None,
            'sync_type': self.sync_type,
            'sync_status': self.sync_status,
            'readings_synced': self.readings_synced,
            'error_message': self.error_message
        }
