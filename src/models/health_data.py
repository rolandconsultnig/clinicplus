"""
Health Data Models for Smart Watch and Wearable Device Integration
"""

from datetime import datetime
from src.models.user import db

class HealthDataPoint(db.Model):
    """Individual health data point from wearable devices"""
    __tablename__ = 'health_data_points'

    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    
    # Device Information
    device_type = db.Column(db.String(50))  # apple_watch, wear_os, fitbit, etc.
    device_id = db.Column(db.String(255))  # Unique device identifier
    device_name = db.Column(db.String(255))  # User-friendly device name
    
    # Data Type and Value
    data_type = db.Column(db.String(50), nullable=False)  # heart_rate, steps, sleep, blood_pressure, etc.
    value = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(20))  # bpm, count, hours, mmHg, etc.
    
    # Timestamp
    recorded_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    # Metadata
    data_metadata = db.Column(db.Text)  # JSON string for additional data
    source = db.Column(db.String(50), default='wearable')  # wearable, manual, imported
    
    # Quality indicators
    quality_score = db.Column(db.Float)  # 0-1, data quality indicator
    is_valid = db.Column(db.Boolean, default=True)
    
    # System fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'device_type': self.device_type,
            'device_id': self.device_id,
            'device_name': self.device_name,
            'data_type': self.data_type,
            'value': self.value,
            'unit': self.unit,
            'recorded_at': self.recorded_at.isoformat() if self.recorded_at else None,
            'metadata': self.data_metadata,
            'source': self.source,
            'quality_score': self.quality_score,
            'is_valid': self.is_valid,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class HealthDataSummary(db.Model):
    """Daily/weekly summaries of health data"""
    __tablename__ = 'health_data_summaries'

    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    
    # Summary Period
    summary_date = db.Column(db.Date, nullable=False)
    period_type = db.Column(db.String(20), default='daily')  # daily, weekly, monthly
    
    # Aggregated Data
    avg_heart_rate = db.Column(db.Float)
    max_heart_rate = db.Column(db.Float)
    min_heart_rate = db.Column(db.Float)
    
    total_steps = db.Column(db.Integer)
    total_distance_km = db.Column(db.Float)
    total_calories = db.Column(db.Integer)
    
    sleep_hours = db.Column(db.Float)
    sleep_quality_score = db.Column(db.Float)
    
    avg_blood_pressure_systolic = db.Column(db.Float)
    avg_blood_pressure_diastolic = db.Column(db.Float)
    
    avg_blood_oxygen = db.Column(db.Float)
    
    active_minutes = db.Column(db.Integer)
    exercise_minutes = db.Column(db.Integer)
    
    # Metadata
    data_points_count = db.Column(db.Integer, default=0)
    devices_used = db.Column(db.Text)  # JSON array of device types
    
    # System fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'summary_date': self.summary_date.isoformat() if self.summary_date else None,
            'period_type': self.period_type,
            'avg_heart_rate': self.avg_heart_rate,
            'max_heart_rate': self.max_heart_rate,
            'min_heart_rate': self.min_heart_rate,
            'total_steps': self.total_steps,
            'total_distance_km': self.total_distance_km,
            'total_calories': self.total_calories,
            'sleep_hours': self.sleep_hours,
            'sleep_quality_score': self.sleep_quality_score,
            'avg_blood_pressure_systolic': self.avg_blood_pressure_systolic,
            'avg_blood_pressure_diastolic': self.avg_blood_pressure_diastolic,
            'avg_blood_oxygen': self.avg_blood_oxygen,
            'active_minutes': self.active_minutes,
            'exercise_minutes': self.exercise_minutes,
            'data_points_count': self.data_points_count,
            'devices_used': self.devices_used,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class WearableDevice(db.Model):
    """Registered wearable devices for patients"""
    __tablename__ = 'wearable_devices'

    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    
    # Device Information
    device_type = db.Column(db.String(50), nullable=False)  # apple_watch, wear_os, fitbit, etc.
    device_id = db.Column(db.String(255), nullable=False, unique=True)
    device_name = db.Column(db.String(255))
    manufacturer = db.Column(db.String(100))  # Apple, Samsung, Fitbit, etc.
    model = db.Column(db.String(100))
    
    # Connection Information
    connection_type = db.Column(db.String(50))  # bluetooth, wifi, cloud_sync
    last_sync_at = db.Column(db.DateTime)
    sync_frequency = db.Column(db.String(20), default='realtime')  # realtime, hourly, daily
    
    # Permissions
    data_types_enabled = db.Column(db.Text)  # JSON array of enabled data types
    is_active = db.Column(db.Boolean, default=True)
    
    # System fields
    registered_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'device_type': self.device_type,
            'device_id': self.device_id,
            'device_name': self.device_name,
            'manufacturer': self.manufacturer,
            'model': self.model,
            'connection_type': self.connection_type,
            'last_sync_at': self.last_sync_at.isoformat() if self.last_sync_at else None,
            'sync_frequency': self.sync_frequency,
            'data_types_enabled': self.data_types_enabled,
            'is_active': self.is_active,
            'registered_at': self.registered_at.isoformat() if self.registered_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

