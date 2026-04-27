"""
Radiology workflow models for RIS-style order and reporting.
"""
from datetime import datetime
import json
from src.models.user import db


class RadiologyOrder(db.Model):
    __tablename__ = 'radiology_orders'

    id = db.Column(db.Integer, primary_key=True)
    order_code = db.Column(db.String(40), unique=True, nullable=False, index=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False, index=True)
    ordering_provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=True, index=True)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=True, index=True)
    study_name = db.Column(db.String(200), nullable=False)
    modality = db.Column(db.String(40), nullable=False, default='xray')  # xray, ct, mri, ultrasound, fluoroscopy
    priority = db.Column(db.String(30), nullable=False, default='routine')  # routine, urgent, stat
    indication = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(30), nullable=False, default='ordered')  # ordered, scheduled, in_progress, reported, cancelled
    scheduled_at = db.Column(db.DateTime, nullable=True)
    started_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    report_text = db.Column(db.Text, nullable=True)
    reported_by_user_id = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    reported_at = db.Column(db.DateTime, nullable=True)
    linked_document_id = db.Column(db.Integer, db.ForeignKey('documents.id'), nullable=True)
    dicom_study_uid = db.Column(db.String(120), nullable=True, index=True)
    dicom_series_uid = db.Column(db.String(120), nullable=True)
    accession_number = db.Column(db.String(80), nullable=True, index=True)
    pacs_source = db.Column(db.String(120), nullable=True)  # Placeholder for PACS endpoint identifier
    viewer_vendor = db.Column(db.String(80), nullable=True, default='internal_placeholder')
    dicom_metadata_json = db.Column(db.Text, nullable=True)  # Placeholder metadata contract payload
    ai_triage_score = db.Column(db.Float, nullable=True)
    ai_triage_findings_json = db.Column(db.Text, nullable=True)
    protocol_name = db.Column(db.String(120), nullable=True)
    modality_room = db.Column(db.String(80), nullable=True)
    structured_report_json = db.Column(db.Text, nullable=True)
    critical_findings_json = db.Column(db.Text, nullable=True)
    signed_by_user_id = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    signed_at = db.Column(db.DateTime, nullable=True)
    dose_mgy = db.Column(db.Float, nullable=True)
    contrast_details_json = db.Column(db.Text, nullable=True)
    voice_dictation_text = db.Column(db.Text, nullable=True)
    comparison_order_id = db.Column(db.Integer, db.ForeignKey('radiology_orders.id'), nullable=True)
    peer_review_json = db.Column(db.Text, nullable=True)
    referral_status = db.Column(db.String(40), nullable=True, default='pending')
    notes = db.Column(db.Text, nullable=True)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    patient = db.relationship('Patient')
    ordering_provider = db.relationship('Provider')

    def _dicom_metadata(self):
        if not self.dicom_metadata_json:
            return {}
        try:
            parsed = json.loads(self.dicom_metadata_json)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}

    def _read_json_field(self, raw_value):
        if not raw_value:
            return {}
        try:
            parsed = json.loads(raw_value)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}

    def to_dict(self):
        return {
            'id': self.id,
            'order_code': self.order_code,
            'patient_id': self.patient_id,
            'ordering_provider_id': self.ordering_provider_id,
            'facility_id': self.facility_id,
            'study_name': self.study_name,
            'modality': self.modality,
            'priority': self.priority,
            'indication': self.indication,
            'status': self.status,
            'scheduled_at': self.scheduled_at.isoformat() if self.scheduled_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'report_text': self.report_text,
            'reported_by_user_id': self.reported_by_user_id,
            'reported_at': self.reported_at.isoformat() if self.reported_at else None,
            'linked_document_id': self.linked_document_id,
            'dicom_study_uid': self.dicom_study_uid,
            'dicom_series_uid': self.dicom_series_uid,
            'accession_number': self.accession_number,
            'pacs_source': self.pacs_source,
            'viewer_vendor': self.viewer_vendor,
            'dicom_metadata': self._dicom_metadata(),
            'ai_triage_score': self.ai_triage_score,
            'ai_triage_findings': self._read_json_field(self.ai_triage_findings_json),
            'protocol_name': self.protocol_name,
            'modality_room': self.modality_room,
            'structured_report': self._read_json_field(self.structured_report_json),
            'critical_findings': self._read_json_field(self.critical_findings_json),
            'signed_by_user_id': self.signed_by_user_id,
            'signed_at': self.signed_at.isoformat() if self.signed_at else None,
            'dose_mgy': self.dose_mgy,
            'contrast_details': self._read_json_field(self.contrast_details_json),
            'voice_dictation_text': self.voice_dictation_text,
            'comparison_order_id': self.comparison_order_id,
            'peer_review': self._read_json_field(self.peer_review_json),
            'referral_status': self.referral_status,
            'notes': self.notes,
            'created_by_user_id': self.created_by_user_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class RadiologyViewerLaunchToken(db.Model):
    __tablename__ = 'radiology_viewer_launch_tokens'

    id = db.Column(db.Integer, primary_key=True)
    launch_token = db.Column(db.String(120), unique=True, nullable=False, index=True)
    radiology_order_id = db.Column(db.Integer, db.ForeignKey('radiology_orders.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=False, index=True)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=True, index=True)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    consumed_at = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    radiology_order = db.relationship('RadiologyOrder')

    def is_valid(self):
        return self.is_active and self.consumed_at is None and datetime.utcnow() <= self.expires_at

    def to_dict(self):
        return {
            'id': self.id,
            'launch_token': self.launch_token,
            'radiology_order_id': self.radiology_order_id,
            'user_id': self.user_id,
            'facility_id': self.facility_id,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'consumed_at': self.consumed_at.isoformat() if self.consumed_at else None,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class RadiologyShareLink(db.Model):
    __tablename__ = 'radiology_share_links'

    id = db.Column(db.Integer, primary_key=True)
    share_token = db.Column(db.String(120), unique=True, nullable=False, index=True)
    radiology_order_id = db.Column(db.Integer, db.ForeignKey('radiology_orders.id'), nullable=False, index=True)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    audience = db.Column(db.String(40), nullable=False, default='patient')  # patient, referral, external_hospital
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    consumed_at = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    def is_valid(self):
        return self.is_active and self.consumed_at is None and datetime.utcnow() <= self.expires_at

    def to_dict(self):
        return {
            'id': self.id,
            'share_token': self.share_token,
            'radiology_order_id': self.radiology_order_id,
            'created_by_user_id': self.created_by_user_id,
            'audience': self.audience,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'consumed_at': self.consumed_at.isoformat() if self.consumed_at else None,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class RadiologyProtocol(db.Model):
    __tablename__ = 'radiology_protocols'

    id = db.Column(db.Integer, primary_key=True)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=True, index=True)
    name = db.Column(db.String(160), nullable=False, index=True)
    modality = db.Column(db.String(40), nullable=False, default='xray')
    body_part = db.Column(db.String(80), nullable=True)
    duration_min = db.Column(db.Integer, nullable=False, default=15)
    instructions = db.Column(db.Text, nullable=True)
    contrast_required = db.Column(db.Boolean, default=False, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False, index=True)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'facility_id': self.facility_id,
            'name': self.name,
            'modality': self.modality,
            'body_part': self.body_part,
            'duration_min': self.duration_min,
            'instructions': self.instructions,
            'contrast_required': self.contrast_required,
            'is_active': self.is_active,
            'created_by_user_id': self.created_by_user_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class RadiologyPACSConnector(db.Model):
    __tablename__ = 'radiology_pacs_connectors'

    id = db.Column(db.Integer, primary_key=True)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=True, index=True)
    connector_name = db.Column(db.String(120), nullable=False, index=True)
    vendor = db.Column(db.String(80), nullable=False, default='generic')
    base_url = db.Column(db.String(255), nullable=True)
    mllp_host = db.Column(db.String(120), nullable=True)
    mllp_port = db.Column(db.Integer, nullable=True)
    auth_config_json = db.Column(db.Text, nullable=True)
    mwl_mapping_json = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False, index=True)
    created_by_user_id = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def _read_json(self, raw_value):
        if not raw_value:
            return {}
        try:
            parsed = json.loads(raw_value)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}

    def to_dict(self):
        return {
            'id': self.id,
            'facility_id': self.facility_id,
            'connector_name': self.connector_name,
            'vendor': self.vendor,
            'base_url': self.base_url,
            'mllp_host': self.mllp_host,
            'mllp_port': self.mllp_port,
            'auth_config': self._read_json(self.auth_config_json),
            'mwl_mapping': self._read_json(self.mwl_mapping_json),
            'is_active': self.is_active,
            'created_by_user_id': self.created_by_user_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class RadiologyCriticalNotificationEvent(db.Model):
    __tablename__ = 'radiology_critical_notification_events'

    id = db.Column(db.Integer, primary_key=True)
    event_token = db.Column(db.String(120), unique=True, nullable=False, index=True)
    radiology_order_id = db.Column(db.Integer, db.ForeignKey('radiology_orders.id'), nullable=False, index=True)
    channel = db.Column(db.String(40), nullable=False, default='in_app')  # sms, email, in_app
    recipient = db.Column(db.String(160), nullable=True)
    status = db.Column(db.String(40), nullable=False, default='sent')  # sent, delivered, acknowledged
    ack_required = db.Column(db.Boolean, default=True, nullable=False)
    acknowledged_by_user_id = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    acknowledged_at = db.Column(db.DateTime, nullable=True)
    sent_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'event_token': self.event_token,
            'radiology_order_id': self.radiology_order_id,
            'channel': self.channel,
            'recipient': self.recipient,
            'status': self.status,
            'ack_required': self.ack_required,
            'acknowledged_by_user_id': self.acknowledged_by_user_id,
            'acknowledged_at': self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
