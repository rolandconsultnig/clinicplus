"""
Internal Messaging System Models for Clinic+
Provider-to-provider and patient-provider messaging
"""

from datetime import datetime
from src.models.user import db

class Message(db.Model):
    __tablename__ = 'messages'
    
    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Participants
    sender_id = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=False)
    recipient_id = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=False)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    
    # Message Details
    subject = db.Column(db.String(200), nullable=False)
    message_body = db.Column(db.Text, nullable=False)
    message_type = db.Column(db.String(50), default='general')  # general, urgent, alert, notification
    
    # Threading
    parent_message_id = db.Column(db.Integer, db.ForeignKey('messages.id'), nullable=True)
    thread_id = db.Column(db.String(50), index=True)  # Groups related messages
    
    # Status
    status = db.Column(db.String(50), default='unread')  # unread, read, replied, archived, deleted
    priority = db.Column(db.String(50), default='normal')  # low, normal, high, urgent
    
    # Related Records
    related_patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'))
    related_encounter_id = db.Column(db.Integer, db.ForeignKey('clinical_encounters.id'))
    related_appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'))
    
    # Attachments
    attachments = db.Column(db.Text)  # JSON array of attachment paths
    
    # Timestamps
    sent_at = db.Column(db.DateTime, default=datetime.utcnow)
    read_at = db.Column(db.DateTime)
    replied_at = db.Column(db.DateTime)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    sender = db.relationship('UserAccount', foreign_keys=[sender_id], backref='sent_messages')
    recipient = db.relationship('UserAccount', foreign_keys=[recipient_id], backref='received_messages')
    facility = db.relationship('Facility', backref='messages')
    parent_message = db.relationship('Message', remote_side=[id], backref='replies')
    related_patient = db.relationship('Patient', backref='messages')
    
    def to_dict(self):
        return {
            'id': self.id,
            'message_id': self.message_id,
            'sender_id': self.sender_id,
            'recipient_id': self.recipient_id,
            'facility_id': self.facility_id,
            'subject': self.subject,
            'message_body': self.message_body,
            'message_type': self.message_type,
            'parent_message_id': self.parent_message_id,
            'thread_id': self.thread_id,
            'status': self.status,
            'priority': self.priority,
            'related_patient_id': self.related_patient_id,
            'related_encounter_id': self.related_encounter_id,
            'related_appointment_id': self.related_appointment_id,
            'attachments': self.attachments,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'read_at': self.read_at.isoformat() if self.read_at else None,
            'replied_at': self.replied_at.isoformat() if self.replied_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'is_active': self.is_active
        }

class MessageTemplate(db.Model):
    __tablename__ = 'message_templates'
    
    id = db.Column(db.Integer, primary_key=True)
    template_name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    subject = db.Column(db.String(200), nullable=False)
    body = db.Column(db.Text, nullable=False)
    template_type = db.Column(db.String(50), default='general')
    
    # Usage
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=True)
    is_global = db.Column(db.Boolean, default=False)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    facility = db.relationship('Facility', backref='message_templates')
    
    def to_dict(self):
        return {
            'id': self.id,
            'template_name': self.template_name,
            'description': self.description,
            'subject': self.subject,
            'body': self.body,
            'template_type': self.template_type,
            'facility_id': self.facility_id,
            'is_global': self.is_global,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by': self.created_by,
            'is_active': self.is_active
        }

