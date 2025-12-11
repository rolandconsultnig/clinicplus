"""
Notification Preferences Model for Clinic+
Stores user notification preferences
"""
from datetime import datetime
from src.models.user import db
import json

class NotificationPreferences(db.Model):
    __tablename__ = 'notification_preferences'
    
    id = db.Column(db.Integer, primary_key=True)
    user_account_id = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=False, unique=True)
    
    # Email Notifications
    email_appointments = db.Column(db.Boolean, default=True)
    email_messages = db.Column(db.Boolean, default=True)
    email_lab_results = db.Column(db.Boolean, default=True)
    email_prescriptions = db.Column(db.Boolean, default=True)
    email_billing = db.Column(db.Boolean, default=True)
    email_reminders = db.Column(db.Boolean, default=True)
    email_alerts = db.Column(db.Boolean, default=True)
    email_newsletter = db.Column(db.Boolean, default=False)
    
    # SMS Notifications
    sms_appointments = db.Column(db.Boolean, default=True)
    sms_messages = db.Column(db.Boolean, default=False)
    sms_lab_results = db.Column(db.Boolean, default=True)
    sms_prescriptions = db.Column(db.Boolean, default=False)
    sms_billing = db.Column(db.Boolean, default=False)
    sms_reminders = db.Column(db.Boolean, default=True)
    sms_alerts = db.Column(db.Boolean, default=True)
    
    # Push Notifications (for mobile app)
    push_appointments = db.Column(db.Boolean, default=True)
    push_messages = db.Column(db.Boolean, default=True)
    push_lab_results = db.Column(db.Boolean, default=True)
    push_prescriptions = db.Column(db.Boolean, default=True)
    push_billing = db.Column(db.Boolean, default=True)
    push_reminders = db.Column(db.Boolean, default=True)
    push_alerts = db.Column(db.Boolean, default=True)
    
    # In-App Notifications
    in_app_appointments = db.Column(db.Boolean, default=True)
    in_app_messages = db.Column(db.Boolean, default=True)
    in_app_lab_results = db.Column(db.Boolean, default=True)
    in_app_prescriptions = db.Column(db.Boolean, default=True)
    in_app_billing = db.Column(db.Boolean, default=True)
    in_app_reminders = db.Column(db.Boolean, default=True)
    in_app_alerts = db.Column(db.Boolean, default=True)
    
    # Quiet Hours (do not send notifications during these hours)
    quiet_hours_enabled = db.Column(db.Boolean, default=False)
    quiet_hours_start = db.Column(db.String(5), default='22:00')  # HH:MM format
    quiet_hours_end = db.Column(db.String(5), default='08:00')  # HH:MM format
    
    # Urgent Notifications (always sent regardless of preferences)
    urgent_override = db.Column(db.Boolean, default=True)  # Always send urgent notifications
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    user_account = db.relationship('UserAccount', backref='notification_preferences', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_account_id': self.user_account_id,
            'email': {
                'appointments': self.email_appointments,
                'messages': self.email_messages,
                'lab_results': self.email_lab_results,
                'prescriptions': self.email_prescriptions,
                'billing': self.email_billing,
                'reminders': self.email_reminders,
                'alerts': self.email_alerts,
                'newsletter': self.email_newsletter
            },
            'sms': {
                'appointments': self.sms_appointments,
                'messages': self.sms_messages,
                'lab_results': self.sms_lab_results,
                'prescriptions': self.sms_prescriptions,
                'billing': self.sms_billing,
                'reminders': self.sms_reminders,
                'alerts': self.sms_alerts
            },
            'push': {
                'appointments': self.push_appointments,
                'messages': self.push_messages,
                'lab_results': self.push_lab_results,
                'prescriptions': self.push_prescriptions,
                'billing': self.push_billing,
                'reminders': self.push_reminders,
                'alerts': self.push_alerts
            },
            'in_app': {
                'appointments': self.in_app_appointments,
                'messages': self.in_app_messages,
                'lab_results': self.in_app_lab_results,
                'prescriptions': self.in_app_prescriptions,
                'billing': self.in_app_billing,
                'reminders': self.in_app_reminders,
                'alerts': self.in_app_alerts
            },
            'quiet_hours': {
                'enabled': self.quiet_hours_enabled,
                'start': self.quiet_hours_start,
                'end': self.quiet_hours_end
            },
            'urgent_override': self.urgent_override,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    @classmethod
    def get_or_create(cls, user_account_id):
        """Get existing preferences or create default ones"""
        prefs = cls.query.filter_by(user_account_id=user_account_id).first()
        if not prefs:
            prefs = cls(user_account_id=user_account_id)
            db.session.add(prefs)
            db.session.commit()
        return prefs

