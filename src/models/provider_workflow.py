"""
Provider Workflow Models
"""
from datetime import datetime
import json
from src.models.user import db


class ProviderWorkflowTemplate(db.Model):
    __tablename__ = 'provider_workflow_templates'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), nullable=False, index=True)
    description = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(80), default='General')
    duration = db.Column(db.String(80), nullable=True)
    steps_json = db.Column(db.Text, nullable=False)
    is_active = db.Column(db.Boolean, default=True, index=True)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'category': self.category,
            'duration': self.duration,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class ProviderWorkflowInstance(db.Model):
    __tablename__ = 'provider_workflow_instances'

    id = db.Column(db.Integer, primary_key=True)
    template_id = db.Column(db.Integer, db.ForeignKey('provider_workflow_templates.id'), nullable=False, index=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False, index=True)
    started_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    status = db.Column(db.String(30), default='active', index=True)  # active, paused, completed, cancelled
    started_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    completed_at = db.Column(db.DateTime, nullable=True)

    template = db.relationship('ProviderWorkflowTemplate')
    steps = db.relationship('ProviderWorkflowInstanceStep', backref='instance', lazy=True, cascade='all, delete-orphan')


class ProviderWorkflowInstanceStep(db.Model):
    __tablename__ = 'provider_workflow_instance_steps'

    id = db.Column(db.Integer, primary_key=True)
    instance_id = db.Column(db.Integer, db.ForeignKey('provider_workflow_instances.id'), nullable=False, index=True)
    step_order = db.Column(db.Integer, nullable=False)
    name = db.Column(db.String(160), nullable=False)
    description = db.Column(db.Text, nullable=True)
    required = db.Column(db.Boolean, default=True)
    estimated_time = db.Column(db.String(60), nullable=True)
    status = db.Column(db.String(20), default='pending')  # pending, current, completed
    completed_at = db.Column(db.DateTime, nullable=True)
    completed_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'order': self.step_order,
            'required': self.required,
            'estimated_time': self.estimated_time,
            'completed': self.status == 'completed',
            'current': self.status == 'current',
            'status': self.status,
        }


class OTResource(db.Model):
    __tablename__ = 'ot_resources'

    id = db.Column(db.Integer, primary_key=True)
    resource_code = db.Column(db.String(60), unique=True, nullable=False, index=True)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=True, index=True)
    name = db.Column(db.String(160), nullable=False)
    resource_type = db.Column(db.String(60), nullable=False)  # room, equipment, staff
    quantity_total = db.Column(db.Integer, default=1, nullable=False)
    quantity_available = db.Column(db.Integer, default=1, nullable=False)
    status = db.Column(db.String(30), default='available')  # available, partially_allocated, unavailable
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'resource_code': self.resource_code,
            'facility_id': self.facility_id,
            'name': self.name,
            'resource_type': self.resource_type,
            'quantity_total': self.quantity_total,
            'quantity_available': self.quantity_available,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class OTSchedule(db.Model):
    __tablename__ = 'ot_schedules'

    id = db.Column(db.Integer, primary_key=True)
    schedule_id = db.Column(db.String(60), unique=True, nullable=False, index=True)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=True, index=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False, index=True)
    encounter_id = db.Column(db.Integer, db.ForeignKey('clinical_encounters.id'), nullable=True, index=True)
    procedure_name = db.Column(db.String(200), nullable=False)
    ot_room = db.Column(db.String(120), nullable=False)
    surgeon_name = db.Column(db.String(160), nullable=True)
    anesthetist_name = db.Column(db.String(160), nullable=True)
    scheduled_start = db.Column(db.DateTime, nullable=False, index=True)
    scheduled_end = db.Column(db.DateTime, nullable=False, index=True)
    status = db.Column(db.String(30), default='scheduled', index=True)  # scheduled, in_progress, completed, cancelled
    required_resources_json = db.Column(db.Text, nullable=True)
    allocated_resources_json = db.Column(db.Text, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    started_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    cancelled_at = db.Column(db.DateTime, nullable=True)
    cancellation_reason = db.Column(db.String(255), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def _parse_json_list(self, raw):
        if not raw:
            return []
        try:
            data = json.loads(raw)
            return data if isinstance(data, list) else []
        except Exception:
            return []

    def to_dict(self):
        return {
            'id': self.id,
            'schedule_id': self.schedule_id,
            'facility_id': self.facility_id,
            'patient_id': self.patient_id,
            'encounter_id': self.encounter_id,
            'procedure_name': self.procedure_name,
            'ot_room': self.ot_room,
            'surgeon_name': self.surgeon_name,
            'anesthetist_name': self.anesthetist_name,
            'scheduled_start': self.scheduled_start.isoformat() if self.scheduled_start else None,
            'scheduled_end': self.scheduled_end.isoformat() if self.scheduled_end else None,
            'status': self.status,
            'required_resources': self._parse_json_list(self.required_resources_json),
            'allocated_resources': self._parse_json_list(self.allocated_resources_json),
            'notes': self.notes,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'cancelled_at': self.cancelled_at.isoformat() if self.cancelled_at else None,
            'cancellation_reason': self.cancellation_reason,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class NurseShiftHandoff(db.Model):
    __tablename__ = 'nurse_shift_handoffs'

    id = db.Column(db.Integer, primary_key=True)
    handoff_id = db.Column(db.String(60), unique=True, nullable=False, index=True)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=True, index=True)
    shift_date = db.Column(db.Date, nullable=False, index=True)
    shift_name = db.Column(db.String(40), nullable=False, index=True)  # morning, afternoon, night
    outgoing_nurse_id = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    incoming_nurse_id = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    summary_json = db.Column(db.Text, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        try:
            parsed_summary = json.loads(self.summary_json) if self.summary_json else {}
        except Exception:
            parsed_summary = {}
        return {
            'id': self.id,
            'handoff_id': self.handoff_id,
            'facility_id': self.facility_id,
            'shift_date': self.shift_date.isoformat() if self.shift_date else None,
            'shift_name': self.shift_name,
            'outgoing_nurse_id': self.outgoing_nurse_id,
            'incoming_nurse_id': self.incoming_nurse_id,
            'summary': parsed_summary,
            'notes': self.notes,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
