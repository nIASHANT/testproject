"""add deployment environments

Revision ID: ae71170dd61a
Revises: 62de22f65282
Create Date: 2026-09-17 01:15:32.944428

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "ae71170dd61a"
down_revision = "62de22f65282"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "deployment_environments",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("branch", sa.String(length=255), nullable=False),
        sa.Column("platform", sa.String(length=100), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("variables", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "deployments",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("environment_id", sa.UUID(), nullable=False),
        sa.Column("commit_sha", sa.String(length=255), nullable=True),
        sa.Column("branch", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("platform", sa.String(length=100), nullable=True),
        sa.Column("logs", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["environment_id"],
            ["deployment_environments.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade():
    op.drop_table("deployments")
    op.drop_table("deployment_environments")
