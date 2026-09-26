import uuid
from datetime import datetime

from sqlalchemy import Column, ForeignKey, String, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class DeploymentEnvironment(Base):
    __tablename__ = "deployment_environments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )

    name = Column(String(50), nullable=False)
    repository_url = Column(String(500), nullable=True)

    branch = Column(String(255), nullable=False, default="main")
    platform = Column(String(100), nullable=True)
    status = Column(String(50), nullable=False, default="active")
    variables = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    project = relationship("Project", back_populates="deployment_environments")

    deployments = relationship(
        "Deployment",
        back_populates="environment",
        cascade="all, delete-orphan",
    )