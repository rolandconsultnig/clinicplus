"""
Scheduling & Queue System Models
"""
from datetime import datetime, date, time
from src.models.user import db

class Appointment(db.Model):
    __tablename__ = 'appointments'
    
    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Patient and Provider
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=False)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    
    # Appointment Details
    appointment_type = db.Column(db.String(50), nullable=False)  # consultation, follow_up, procedure, telemedicine
    appointment_date = db.Column(db.Date, nullable=False)
    appointment_time = db.Column(db.Time, nullable=False)
    duration_minutes = db.Column(db.Integer, default=30)
    
    # Status
    status = db.Column(db.String(50), default='scheduled')  # scheduled, confirmed, checked_in, in_progress, completed, cancelled, no_show
    priority = db.Column(db.String(20), default='routine')  # routine, urgent, emergency
    
    # Recurring Appointments
    is_recurring = db.Column(db.Boolean, default=False)
    recurrence_pattern = db.Column(db.String(50))  # daily, weekly, monthly, custom
    recurrence_end_date = db.Column(db.Date)
    parent_appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'))
    
    # Reminders
    reminder_sent_sms = db.Column(db.Boolean, default=False)
    reminder_sent_email = db.Column(db.Boolean, default=False)
    reminder_sent_at = db.Column(db.DateTime)
    
    # Check-in
    checked_in_at = db.Column(db.DateTime)
    checked_in_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    
    # Notes
    reason_for_visit = db.Column(db.Text)
    notes = db.Column(db.Text)
    cancellation_reason = db.Column(db.Text)
    cancelled_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    cancelled_at = db.Column(db.DateTime)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    
    # Relationships
    # Note: ClinicalEncounter doesn't have appointment_id FK, so relationship removed
    # encounter = db.relationship('ClinicalEncounter', backref='appointment', uselist=False, lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'appointment_id': self.appointment_id,
            'patient_id': self.patient_id,
            'provider_id': self.provider_id,
            'facility_id': self.facility_id,
            'appointment_type': self.appointment_type,
            'appointment_date': self.appointment_date.isoformat() if self.appointment_date else None,
            'appointment_time': self.appointment_time.strftime('%H:%M:%S') if self.appointment_time else None,
            'duration_minutes': self.duration_minutes,
            'status': self.status,
            'priority': self.priority,
            'is_recurring': self.is_recurring,
            'reason_for_visit': self.reason_for_visit,
            'checked_in_at': self.checked_in_at.isoformat() if self.checked_in_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class QueueEntry(db.Model):
    __tablename__ = 'queue_entries'
    
    id = db.Column(db.Integer, primary_key=True)
    queue_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Patient and Appointment
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'), nullable=True)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    
    # Queue Details
    queue_type = db.Column(db.String(50), nullable=False)  # walk_in, appointment, emergency
    priority = db.Column(db.Integer, default=0)  # Higher number = higher priority
    position = db.Column(db.Integer, nullable=False)
    
    # Status
    status = db.Column(db.String(50), default='waiting')  # waiting, called, in_progress, completed, cancelled
    called_at = db.Column(db.DateTime)
    started_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    
    # Provider Assignment
    assigned_provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=True)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'queue_id': self.queue_id,
            'patient_id': self.patient_id,
            'appointment_id': self.appointment_id,
            'facility_id': self.facility_id,
            'queue_type': self.queue_type,
            'priority': self.priority,
            'position': self.position,
            'status': self.status,
            'assigned_provider_id': self.assigned_provider_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class ProviderSchedule(db.Model):
    __tablename__ = 'provider_schedules'
    
    id = db.Column(db.Integer, primary_key=True)
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=False)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    
    # Schedule Details
    day_of_week = db.Column(db.Integer, nullable=False)  # 0=Monday, 6=Sunday
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    
    # Availability
    is_available = db.Column(db.Boolean, default=True)
    appointment_duration = db.Column(db.Integer, default=30)  # minutes
    
    # Break Times (JSON string)
    break_times = db.Column(db.Text)  # JSON: [{"start": "12:00", "end": "13:00"}]
    
    # Effective Dates
    effective_from = db.Column(db.Date, nullable=False)
    effective_to = db.Column(db.Date)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'provider_id': self.provider_id,
            'facility_id': self.facility_id,
            'day_of_week': self.day_of_week,
            'start_time': self.start_time.strftime('%H:%M:%S') if self.start_time else None,
            'end_time': self.end_time.strftime('%H:%M:%S') if self.end_time else None,
            'is_available': self.is_available,
            'appointment_duration': self.appointment_duration,
            'effective_from': self.effective_from.isoformat() if self.effective_from else None,
            'effective_to': self.effective_to.isoformat() if self.effective_to else None
        }

