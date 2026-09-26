"""add repository url to deployment environments

Revision ID: 975a70b51fce
Revises: ae71170dd61a
Create Date: 2026-09-19 17:31:21.379021

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "975a70b51fce"
down_revision = "ae71170dd61a"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "deployment_environments",
        sa.Column(
            "repository_url",
            sa.String(length=500),
            nullable=True,
        ),
    )


def downgrade():
    op.drop_column(
        "deployment_environments",
        "repository_url",
    )
