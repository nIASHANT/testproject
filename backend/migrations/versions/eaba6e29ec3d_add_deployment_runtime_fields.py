"""add deployment runtime fields

Revision ID: eaba6e29ec3d
Revises: 975a70b51fce
Create Date: 2026-09-21 01:40:43.583871

"""
from alembic import op
import sqlalchemy as sa


revision = "eaba6e29ec3d"
down_revision = "975a70b51fce"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "deployments",
        sa.Column(
            "deployment_url",
            sa.String(length=500),
            nullable=True,
        ),
    )

    op.add_column(
        "deployments",
        sa.Column(
            "image_name",
            sa.String(length=255),
            nullable=True,
        ),
    )

    op.add_column(
        "deployments",
        sa.Column(
            "container_name",
            sa.String(length=255),
            nullable=True,
        ),
    )

    op.add_column(
        "deployments",
        sa.Column(
            "container_id",
            sa.String(length=255),
            nullable=True,
        ),
    )


def downgrade():
    op.drop_column(
        "deployments",
        "container_id",
    )

    op.drop_column(
        "deployments",
        "container_name",
    )

    op.drop_column(
        "deployments",
        "image_name",
    )

    op.drop_column(
        "deployments",
        "deployment_url",
    )
