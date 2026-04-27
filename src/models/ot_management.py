"""
Operation Theatre management models.
"""
from datetime import datetime
from src.models.user import db


class OTSurgerySchedule(db.Model):
    __tablename__ = 'ot_surgery_schedules'

    id = db.Column(db.Integer, primary_key=True)
    surgery_code = db.Column(db.String(40), unique=True, nullable=False, index=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=True, index=True)
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=True, index=True)
    theatre_name = db.Column(db.String(80), nullable=False, default='OT-1')
    procedure_name = db.Column(db.String(200), nullable=False)
    scheduled_start = db.Column(db.DateTime, nullable=False)
    estimated_duration_minutes = db.Column(db.Integer, nullable=False, default=60)
    priority = db.Column(db.String(20), nullable=False, default='routine')  # routine, urgent, emergency
    status = db.Column(db.String(30), nullable=False, default='scheduled')  # scheduled, in_progress, completed, cancelled
    anesthesia_type = db.Column(db.String(60), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'surgery_code': self.surgery_code,
            'patient_id': self.patient_id,
            'provider_id': self.provider_id,
            'theatre_name': self.theatre_name,
            'procedure_name': self.procedure_name,
            'scheduled_start': self.scheduled_start.isoformat() if self.scheduled_start else None,
            'estimated_duration_minutes': self.estimated_duration_minutes,
            'priority': self.priority,
            'status': self.status,
            'anesthesia_type': self.anesthesia_type,
            'notes': self.notes,
            'created_by_user_id': self.created_by_user_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
