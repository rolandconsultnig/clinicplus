"""add report run history table

Revision ID: todo2_2026_04_report_history
Revises: merge_nin_todo2_2026
Create Date: 2026-04-27
"""
from alembic import op
import sqlalchemy as sa

revision = 'todo2_2026_04_report_history'
down_revision = 'merge_nin_todo2_2026'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'report_run_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('job_id', sa.Integer(), nullable=False),
        sa.Column('saved_report_id', sa.Integer(), nullable=False),
        sa.Column('run_at', sa.DateTime(), nullable=True),
        sa.Column('format', sa.String(length=20), nullable=True),
        sa.Column('row_count', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=40), nullable=True),
        sa.Column('email_status', sa.String(length=200), nullable=True),
        sa.Column('file_name', sa.String(length=255), nullable=True),
        sa.Column('trigger_type', sa.String(length=20), nullable=True),
        sa.ForeignKeyConstraint(['job_id'], ['report_schedule_jobs.id'], ),
        sa.ForeignKeyConstraint(['saved_report_id'], ['saved_reports.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_report_run_history_job_id', 'report_run_history', ['job_id'], unique=False)
    op.create_index('ix_report_run_history_saved_report_id', 'report_run_history', ['saved_report_id'], unique=False)
    op.create_index('ix_report_run_history_run_at', 'report_run_history', ['run_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_report_run_history_run_at', table_name='report_run_history')
    op.drop_index('ix_report_run_history_saved_report_id', table_name='report_run_history')
    op.drop_index('ix_report_run_history_job_id', table_name='report_run_history')
    op.drop_table('report_run_history')

