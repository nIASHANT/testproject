import uuid

from sqlalchemy import Column, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    name = Column(
        String(255),
        nullable=False,
    )

    description = Column(
        Text,
        nullable=True,
    )

    owner_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )

    owner = relationship(
        "User",
        back_populates="projects",
    )

    repository = relationship(
        "Repository",
        back_populates="project",
        uselist=False,
    )

    files = relationship(
        "ProjectFile",
        back_populates="project",
        cascade="all, delete-orphan",
    )

    deployment_environments = relationship(
        "DeploymentEnvironment",
        back_populates="project",
        cascade="all, delete-orphan",
    )
    