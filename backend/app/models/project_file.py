import uuid
from datetime import datetime

from sqlalchemy import (
    Column,
    ForeignKey,
    String,
    DateTime,
    BigInteger,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class ProjectFile(Base):
    __tablename__ = "project_files"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "projects.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    original_filename = Column(
        String(500),
        nullable=False,
    )

    stored_filename = Column(
        String(500),
        nullable=False,
    )

    content_type = Column(
        String(255),
        nullable=True,
    )

    size = Column(
        BigInteger,
        nullable=False,
    )

    storage_path = Column(
        String(1000),
        nullable=False,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    project = relationship(
        "Project",
        back_populates="files",
    )
