"""add project files

Revision ID: 8860f5f2ab18
Revises: 90306ed15611
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "8860f5f2ab18"
down_revision = "90306ed15611"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "project_files",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "original_filename",
            sa.String(length=500),
            nullable=False,
        ),
        sa.Column(
            "stored_filename",
            sa.String(length=500),
            nullable=False,
        ),
        sa.Column(
            "content_type",
            sa.String(length=255),
            nullable=True,
        ),
        sa.Column(
            "size",
            sa.BigInteger(),
            nullable=False,
        ),
        sa.Column(
            "storage_path",
            sa.String(length=1000),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            ondelete="CASCADE",
        ),
    )


def downgrade():
    op.drop_table("project_files")
