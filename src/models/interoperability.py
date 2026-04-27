"""
Interoperability Models (SMART on FHIR, HL7 v2)
"""
from datetime import datetime
from src.models.user import db


class SMARTClientRegistration(db.Model):
    __tablename__ = 'smart_client_registrations'

    id = db.Column(db.Integer, primary_key=True)
    client_id = db.Column(db.String(120), unique=True, nullable=False, index=True)
    client_secret = db.Column(db.String(255), nullable=False)
    client_name = db.Column(db.String(180), nullable=False)
    redirect_uris_json = db.Column(db.Text, nullable=False)
    scope = db.Column(db.Text, nullable=True)
    grant_types_json = db.Column(db.Text, nullable=True)
    response_types_json = db.Column(db.Text, nullable=True)
    token_endpoint_auth_method = db.Column(db.String(80), default='client_secret_basic')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'client_id': self.client_id,
            'client_name': self.client_name,
            'redirect_uris_json': self.redirect_uris_json,
            'scope': self.scope,
            'grant_types_json': self.grant_types_json,
            'response_types_json': self.response_types_json,
            'token_endpoint_auth_method': self.token_endpoint_auth_method,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class HL7MessageLog(db.Model):
    __tablename__ = 'hl7_message_logs'

    id = db.Column(db.Integer, primary_key=True)
    direction = db.Column(db.String(20), nullable=False)  # inbound|outbound
    message_type = db.Column(db.String(30), nullable=True)  # ADT^A01, ORU^R01, ...
    message_control_id = db.Column(db.String(80), nullable=True, index=True)
    source_system = db.Column(db.String(120), nullable=True)
    destination_system = db.Column(db.String(120), nullable=True)
    destination_url = db.Column(db.String(255), nullable=True)
    destination_port = db.Column(db.Integer, nullable=True)
    status = db.Column(db.String(30), default='received')  # received|processed|sent|failed
    payload = db.Column(db.Text, nullable=False)
    parsed_json = db.Column(db.Text, nullable=True)
    processing_result_json = db.Column(db.Text, nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'direction': self.direction,
            'message_type': self.message_type,
            'message_control_id': self.message_control_id,
            'source_system': self.source_system,
            'destination_system': self.destination_system,
            'destination_url': self.destination_url,
            'destination_port': self.destination_port,
            'status': self.status,
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
