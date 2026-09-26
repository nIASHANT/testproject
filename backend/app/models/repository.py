import uuid

from sqlalchemy import Column, ForeignKey, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime

from app.db.session import Base


class Repository(Base):
    __tablename__ = "repositories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id"),
        nullable=False,
    )

    repo_url = Column(String(500), nullable=False)
    branch = Column(String(100), default="main")
    provider = Column(String(50), default="github")

    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship(
        "Project",
        back_populates="repository",
    )
