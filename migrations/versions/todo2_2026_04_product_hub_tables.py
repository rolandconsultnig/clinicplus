"""todo-2 support tables: idempotency, RCM, waitlist, saved reports, scheduling meta, document revisions

Revision ID: todo2_2026_04
Revises: a1158ae841a2
Create Date: 2026-04-26
"""
from alembic import op
import sqlalchemy as sa

revision = 'todo2_2026_04'
down_revision = 'a1158ae841a2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('webhook_idempotency',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('provider', sa.String(30), nullable=False),
        sa.Column('event_id', sa.String(120), nullable=False),
        sa.Column('payload_hash', sa.String(64), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('note', sa.String(200), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_webhook_idempotency_event_id', 'webhook_idempotency', ['event_id'], unique=True)
    op.create_index('ix_webhook_idempotency_provider', 'webhook_idempotency', ['provider'], unique=False)

    op.create_table('collection_notes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('patient_id', sa.Integer(), nullable=False),
        sa.Column('facility_id', sa.Integer(), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('follow_up_date', sa.Date(), nullable=True),
        sa.Column('dunning_level', sa.Integer(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['user_accounts.id'], ),
        sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_collection_notes_patient_id', 'collection_notes', ['patient_id'], unique=False)

    op.create_table('payment_plans',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('plan_code', sa.String(50), nullable=False),
        sa.Column('patient_id', sa.Integer(), nullable=False),
        sa.Column('facility_id', sa.Integer(), nullable=False),
        sa.Column('total_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('balance_due', sa.Numeric(12, 2), nullable=False),
        sa.Column('installment_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('cycle_days', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(30), nullable=True),
        sa.Column('next_due_date', sa.Date(), nullable=True),
        sa.Column('late_fee_exempt', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_payment_plans_plan_code', 'payment_plans', ['plan_code'], unique=True)
    op.create_index('ix_payment_plans_patient_id', 'payment_plans', ['patient_id'], unique=False)

    op.create_table('saved_reports',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('spec_json', sa.Text(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('facility_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['user_accounts.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_saved_reports_user_id', 'saved_reports', ['user_id'], unique=False)

    op.create_table('report_schedule_jobs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('saved_report_id', sa.Integer(), nullable=False),
        sa.Column('cron_expression', sa.String(80), nullable=True),
        sa.Column('email_to', sa.String(200), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('last_run_at', sa.DateTime(), nullable=True),
        sa.Column('last_status', sa.String(200), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['saved_report_id'], ['saved_reports.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('waitlist_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('patient_id', sa.Integer(), nullable=False),
        sa.Column('provider_id', sa.Integer(), nullable=True),
        sa.Column('facility_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(30), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('preferred_start', sa.Date(), nullable=True),
        sa.Column('preferred_end', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('position', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
        sa.ForeignKeyConstraint(['provider_id'], ['providers.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_waitlist_entries_patient_id', 'waitlist_entries', ['patient_id'], unique=False)

    op.create_table('appointment_scheduling_meta',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('appointment_id', sa.Integer(), nullable=False),
        sa.Column('patient_confirmed_at', sa.DateTime(), nullable=True),
        sa.Column('no_show_marked_at', sa.DateTime(), nullable=True),
        sa.Column('no_show_by', sa.Integer(), nullable=True),
        sa.Column('external_calendar', sa.String(30), nullable=True),
        sa.Column('external_event_id', sa.String(200), nullable=True),
        sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id'], ),
        sa.ForeignKeyConstraint(['no_show_by'], ['user_accounts.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_appointment_scheduling_meta_appointment_id', 'appointment_scheduling_meta', ['appointment_id'], unique=True)

    op.create_table('document_revisions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('logical_key', sa.String(120), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('storage_path', sa.String(500), nullable=True),
        sa.Column('file_name', sa.String(300), nullable=True),
        sa.Column('patient_id', sa.Integer(), nullable=True),
        sa.Column('facility_id', sa.Integer(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('change_note', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['user_accounts.id'], ),
        sa.ForeignKeyConstraint(['facility_id'], ['facilities.id'], ),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_document_revisions_logical_key', 'document_revisions', ['logical_key'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_document_revisions_logical_key', table_name='document_revisions')
    op.drop_table('document_revisions')
    op.drop_index('ix_appointment_scheduling_meta_appointment_id', table_name='appointment_scheduling_meta')
    op.drop_table('appointment_scheduling_meta')
    op.drop_index('ix_waitlist_entries_patient_id', table_name='waitlist_entries')
    op.drop_table('waitlist_entries')
    op.drop_table('report_schedule_jobs')
    op.drop_index('ix_saved_reports_user_id', table_name='saved_reports')
    op.drop_table('saved_reports')
    op.drop_index('ix_payment_plans_patient_id', table_name='payment_plans')
    op.drop_index('ix_payment_plans_plan_code', table_name='payment_plans')
    op.drop_table('payment_plans')
    op.drop_index('ix_collection_notes_patient_id', table_name='collection_notes')
    op.drop_table('collection_notes')
    op.drop_index('ix_webhook_idempotency_provider', table_name='webhook_idempotency')
    op.drop_index('ix_webhook_idempotency_event_id', table_name='webhook_idempotency')
    op.drop_table('webhook_idempotency')
