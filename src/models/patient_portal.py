"""
Patient Portal Models for Clinic+
Patient-facing portal functionality
"""

from datetime import datetime
from src.models.user import db

class PortalMessage(db.Model):
    __tablename__ = 'portal_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=True)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    
    # Message Details
    subject = db.Column(db.String(200), nullable=False)
    message_body = db.Column(db.Text, nullable=False)
    message_type = db.Column(db.String(50), default='general')  # general, appointment, prescription, lab, billing
    
    # Status
    status = db.Column(db.String(50), default='unread')  # unread, read, replied, archived
    is_from_patient = db.Column(db.Boolean, default=True)
    
    # Related Records
    related_appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'))
    related_prescription_id = db.Column(db.Integer, db.ForeignKey('prescriptions.id'))
    related_lab_result_id = db.Column(db.Integer, db.ForeignKey('lab_results.id'))
    
    # Attachments
    attachments = db.Column(db.Text)  # JSON array of attachment paths
    
    # Timestamps
    read_at = db.Column(db.DateTime)
    replied_at = db.Column(db.DateTime)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    patient = db.relationship('Patient', backref='portal_messages')
    provider = db.relationship('Provider', backref='portal_messages')
    facility = db.relationship('Facility', backref='portal_messages')
    
    def to_dict(self):
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'provider_id': self.provider_id,
            'facility_id': self.facility_id,
            'subject': self.subject,
            'message_body': self.message_body,
            'message_type': self.message_type,
            'status': self.status,
            'is_from_patient': self.is_from_patient,
            'related_appointment_id': self.related_appointment_id,
            'related_prescription_id': self.related_prescription_id,
            'related_lab_result_id': self.related_lab_result_id,
            'attachments': self.attachments,
            'read_at': self.read_at.isoformat() if self.read_at else None,
            'replied_at': self.replied_at.isoformat() if self.replied_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'is_active': self.is_active
        }

class PortalAccessLog(db.Model):
    __tablename__ = 'portal_access_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    access_type = db.Column(db.String(50), nullable=False)  # login, view_record, download_document, schedule_appointment, etc.
    resource_type = db.Column(db.String(50))  # appointment, prescription, lab_result, document
    resource_id = db.Column(db.Integer)
    ip_address = db.Column(db.String(50))
    user_agent = db.Column(db.String(200))
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    patient = db.relationship('Patient', backref='portal_access_logs')
    
    def to_dict(self):
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'access_type': self.access_type,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

