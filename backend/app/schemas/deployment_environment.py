from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class DeploymentEnvironmentCreate(BaseModel):
    project_id: UUID
    name: str
    repository_url: str | None = None
    branch: str = "main"
    platform: str | None = None
    status: str = "active"
    variables: str | None = None


class DeploymentEnvironmentUpdate(BaseModel):
    name: str | None = None
    repository_url: str | None = None
    branch: str | None = None
    platform: str | None = None
    status: str | None = None
    variables: str | None = None


class DeploymentEnvironmentResponse(BaseModel):
    id: UUID
    project_id: UUID
    name: str
    repository_url: str | None = None
    branch: str
    platform: str | None
    status: str
    variables: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
