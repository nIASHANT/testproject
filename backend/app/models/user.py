import uuid

from sqlalchemy import Boolean, Column, String
from sqlalchemy.orm import relationship


from sqlalchemy.dialects.postgresql import UUID

from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    email = Column(String(255), unique=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)

    role = Column(String(50), default="reader", nullable=False)
    is_active = Column(Boolean, default=True)


    projects = relationship(
       "Project",
       back_populates="owner",
    )
