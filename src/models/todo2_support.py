"""
Support models for product roadmap (todo-2) — idempotency, RCM, scheduling meta, etc.
"""
from datetime import datetime
from src.models.user import db


class WebhookIdempotency(db.Model):
    __tablename__ = 'webhook_idempotency'
    id = db.Column(db.Integer, primary_key=True)
    provider = db.Column(db.String(30), nullable=False, index=True)
    event_id = db.Column(db.String(120), nullable=False, unique=True, index=True)
    payload_hash = db.Column(db.String(64))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    note = db.Column(db.String(200))


class CollectionNote(db.Model):
    __tablename__ = 'collection_notes'
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False, index=True)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    body = db.Column(db.Text, nullable=False)
    follow_up_date = db.Column(db.Date)
    dunning_level = db.Column(db.Integer, default=0)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'facility_id': self.facility_id,
            'body': self.body,
            'follow_up_date': self.follow_up_date.isoformat() if self.follow_up_date else None,
            'dunning_level': self.dunning_level,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class PaymentPlan(db.Model):
    __tablename__ = 'payment_plans'
    id = db.Column(db.Integer, primary_key=True)
    plan_code = db.Column(db.String(50), unique=True, nullable=False, index=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False, index=True)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    total_amount = db.Column(db.Numeric(12, 2), nullable=False)
    balance_due = db.Column(db.Numeric(12, 2), nullable=False)
    installment_amount = db.Column(db.Numeric(12, 2), nullable=False)
    cycle_days = db.Column(db.Integer, default=30)
    status = db.Column(db.String(30), default='active')
    next_due_date = db.Column(db.Date)
    late_fee_exempt = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'plan_code': self.plan_code,
            'patient_id': self.patient_id,
            'facility_id': self.facility_id,
            'total_amount': float(self.total_amount) if self.total_amount else 0,
            'balance_due': float(self.balance_due) if self.balance_due else 0,
            'installment_amount': float(self.installment_amount) if self.installment_amount else 0,
            'cycle_days': self.cycle_days,
            'status': self.status,
            'next_due_date': self.next_due_date.isoformat() if self.next_due_date else None,
        }


class SavedReport(db.Model):
    __tablename__ = 'saved_reports'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    spec_json = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=False, index=True)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'spec_json': self.spec_json,
            'user_id': self.user_id,
            'facility_id': self.facility_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class ReportScheduleJob(db.Model):
    __tablename__ = 'report_schedule_jobs'
    id = db.Column(db.Integer, primary_key=True)
    saved_report_id = db.Column(db.Integer, db.ForeignKey('saved_reports.id'), nullable=False)
    cron_expression = db.Column(db.String(80))
    email_to = db.Column(db.String(200))
    is_active = db.Column(db.Boolean, default=True)
    last_run_at = db.Column(db.DateTime)
    last_status = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'saved_report_id': self.saved_report_id,
            'cron_expression': self.cron_expression,
            'email_to': self.email_to,
            'is_active': self.is_active,
            'last_run_at': self.last_run_at.isoformat() if self.last_run_at else None,
        }


class ReportRunHistory(db.Model):
    __tablename__ = 'report_run_history'
    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey('report_schedule_jobs.id'), nullable=False, index=True)
    saved_report_id = db.Column(db.Integer, db.ForeignKey('saved_reports.id'), nullable=False, index=True)
    run_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    format = db.Column(db.String(20), default='json')
    row_count = db.Column(db.Integer, default=0)
    status = db.Column(db.String(40), default='ok')
    email_status = db.Column(db.String(200))
    file_name = db.Column(db.String(255))
    trigger_type = db.Column(db.String(20), default='manual')  # manual|due|worker

    def to_dict(self):
        return {
            'id': self.id,
            'job_id': self.job_id,
            'saved_report_id': self.saved_report_id,
            'run_at': self.run_at.isoformat() if self.run_at else None,
            'format': self.format,
            'row_count': self.row_count,
            'status': self.status,
            'email_status': self.email_status,
            'file_name': self.file_name,
            'trigger_type': self.trigger_type,
        }


class WaitlistEntry(db.Model):
    __tablename__ = 'waitlist_entries'
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False, index=True)
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=True, index=True)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    status = db.Column(db.String(30), default='open')
    notes = db.Column(db.Text)
    preferred_start = db.Column(db.Date)
    preferred_end = db.Column(db.Date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    position = db.Column(db.Integer, default=0)

    def to_dict(self):
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'provider_id': self.provider_id,
            'facility_id': self.facility_id,
            'status': self.status,
            'notes': self.notes,
            'preferred_start': self.preferred_start.isoformat() if self.preferred_start else None,
            'preferred_end': self.preferred_end.isoformat() if self.preferred_end else None,
            'position': self.position,
        }


class AppointmentSchedulingMeta(db.Model):
    __tablename__ = 'appointment_scheduling_meta'
    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'), unique=True, nullable=False, index=True)
    patient_confirmed_at = db.Column(db.DateTime)
    no_show_marked_at = db.Column(db.DateTime)
    no_show_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    external_calendar = db.Column(db.String(30))
    external_event_id = db.Column(db.String(200))

    def to_dict(self):
        return {
            'appointment_id': self.appointment_id,
            'patient_confirmed_at': self.patient_confirmed_at.isoformat() if self.patient_confirmed_at else None,
            'no_show_marked_at': self.no_show_marked_at.isoformat() if self.no_show_marked_at else None,
            'external_calendar': self.external_calendar,
            'external_event_id': self.external_event_id,
        }


class DocumentRevision(db.Model):
    __tablename__ = 'document_revisions'
    id = db.Column(db.Integer, primary_key=True)
    logical_key = db.Column(db.String(120), nullable=False, index=True)
    version = db.Column(db.Integer, nullable=False, default=1)
    storage_path = db.Column(db.String(500))
    file_name = db.Column(db.String(300))
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=True, index=True)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    change_note = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'logical_key': self.logical_key,
            'version': self.version,
            'storage_path': self.storage_path,
            'file_name': self.file_name,
            'patient_id': self.patient_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
