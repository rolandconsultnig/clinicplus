"""Add insurance_companies table

Revision ID: insurance_companies_001
Revises: 40421d7293bf
Create Date: 2025-01-30 19:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'insurance_companies_001'
down_revision = '40421d7293bf'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create insurance_companies table
    op.create_table(
        'insurance_companies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('company_name', sa.String(200), nullable=False),
        sa.Column('tax_id', sa.String(50), nullable=True),
        sa.Column('npi', sa.String(20), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('state', sa.String(50), nullable=True),
        sa.Column('zip_code', sa.String(20), nullable=True),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('fax', sa.String(50), nullable=True),
        sa.Column('email', sa.String(200), nullable=True),
        sa.Column('x12_receiver_id', sa.String(50), nullable=True),
        sa.Column('x12_default_partner_id', sa.String(50), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('insurance_companies')

