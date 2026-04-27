"""add missing ot_surgery_schedules and pharmacy_inventory_lots tables

Revision ID: add_ot_pharmacy_lot_tables
Revises: todo2_2026_04_report_history
Create Date: 2026-04-27
"""
from alembic import op
import sqlalchemy as sa


revision = "add_ot_pharmacy_lot_tables"
down_revision = "todo2_2026_04_report_history"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ot_surgery_schedules",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("surgery_code", sa.String(length=40), nullable=False),
        sa.Column("patient_id", sa.Integer(), nullable=True),
        sa.Column("provider_id", sa.Integer(), nullable=True),
        sa.Column("theatre_name", sa.String(length=80), nullable=False),
        sa.Column("procedure_name", sa.String(length=200), nullable=False),
        sa.Column("scheduled_start", sa.DateTime(), nullable=False),
        sa.Column("estimated_duration_minutes", sa.Integer(), nullable=False),
        sa.Column("priority", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("anesthesia_type", sa.String(length=60), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["user_accounts.id"]),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"]),
        sa.ForeignKeyConstraint(["provider_id"], ["providers.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ot_surgery_schedules_patient_id", "ot_surgery_schedules", ["patient_id"], unique=False)
    op.create_index("ix_ot_surgery_schedules_provider_id", "ot_surgery_schedules", ["provider_id"], unique=False)
    op.create_index("ix_ot_surgery_schedules_surgery_code", "ot_surgery_schedules", ["surgery_code"], unique=True)

    op.create_table(
        "pharmacy_inventory_lots",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("pharmacy_id", sa.Integer(), nullable=False),
        sa.Column("drug_id", sa.Integer(), nullable=False),
        sa.Column("lot_number", sa.String(length=60), nullable=False),
        sa.Column("expiry_date", sa.Date(), nullable=True),
        sa.Column("quantity_on_hand", sa.Integer(), nullable=True),
        sa.Column("unit_cost", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("received_at", sa.DateTime(), nullable=True),
        sa.Column("source_reference", sa.String(length=80), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(["drug_id"], ["drugs.id"]),
        sa.ForeignKeyConstraint(["pharmacy_id"], ["pharmacies.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_pharmacy_inventory_lots_drug_id", "pharmacy_inventory_lots", ["drug_id"], unique=False)
    op.create_index("ix_pharmacy_inventory_lots_expiry_date", "pharmacy_inventory_lots", ["expiry_date"], unique=False)
    op.create_index("ix_pharmacy_inventory_lots_is_active", "pharmacy_inventory_lots", ["is_active"], unique=False)
    op.create_index("ix_pharmacy_inventory_lots_lot_number", "pharmacy_inventory_lots", ["lot_number"], unique=False)
    op.create_index("ix_pharmacy_inventory_lots_pharmacy_id", "pharmacy_inventory_lots", ["pharmacy_id"], unique=False)
    op.create_index("ix_pharmacy_inventory_lots_received_at", "pharmacy_inventory_lots", ["received_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_pharmacy_inventory_lots_received_at", table_name="pharmacy_inventory_lots")
    op.drop_index("ix_pharmacy_inventory_lots_pharmacy_id", table_name="pharmacy_inventory_lots")
    op.drop_index("ix_pharmacy_inventory_lots_lot_number", table_name="pharmacy_inventory_lots")
    op.drop_index("ix_pharmacy_inventory_lots_is_active", table_name="pharmacy_inventory_lots")
    op.drop_index("ix_pharmacy_inventory_lots_expiry_date", table_name="pharmacy_inventory_lots")
    op.drop_index("ix_pharmacy_inventory_lots_drug_id", table_name="pharmacy_inventory_lots")
    op.drop_table("pharmacy_inventory_lots")

    op.drop_index("ix_ot_surgery_schedules_surgery_code", table_name="ot_surgery_schedules")
    op.drop_index("ix_ot_surgery_schedules_provider_id", table_name="ot_surgery_schedules")
    op.drop_index("ix_ot_surgery_schedules_patient_id", table_name="ot_surgery_schedules")
    op.drop_table("ot_surgery_schedules")

