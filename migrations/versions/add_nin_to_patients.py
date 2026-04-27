"""Add NIN to patients table

Revision ID: add_nin_to_patients
Revises: 
Create Date: 2024-12-02 00:03:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_nin_to_patients'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    insp = sa.inspect(conn)
    cols = {c['name'] for c in insp.get_columns('patients')}
    if 'nin' not in cols:
        op.add_column('patients', sa.Column('nin', sa.String(length=11), nullable=True))


def downgrade():
    # Remove nin column from patients table
    op.drop_column('patients', 'nin')
