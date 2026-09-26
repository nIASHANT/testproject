import uuid
from datetime import datetime

from sqlalchemy import Column, ForeignKey, String, DateTime, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class Deployment(Base):
    __tablename__ = "deployments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    environment_id = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "deployment_environments.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    commit_sha = Column(String(255), nullable=True)
    branch = Column(String(255), nullable=True)

    status = Column(
        String(50),
        nullable=False,
        default="queued",
    )

    platform = Column(String(100), nullable=True)
    logs = Column(Text, nullable=True)

    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    duration_seconds = Column(Integer, nullable=True)
    deployment_url = Column(String(500), nullable=True)
    image_name = Column(String(255), nullable=True)
    container_name = Column(String(255), nullable=True)
    container_id = Column(String(255), nullable=True)

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    environment = relationship(
        "DeploymentEnvironment",
        back_populates="deployments",
    )
