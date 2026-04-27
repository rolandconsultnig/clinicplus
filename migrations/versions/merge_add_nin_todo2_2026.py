"""merge heads: add_nin_to_patients + todo2_2026_04

Revision ID: merge_nin_todo2_2026
Revises: add_nin_to_patients, todo2_2026_04
Create Date: 2026-04-26
"""
from alembic import op

revision = 'merge_nin_todo2_2026'
down_revision = ('add_nin_to_patients', 'todo2_2026_04')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
