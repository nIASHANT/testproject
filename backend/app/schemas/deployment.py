from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class DeploymentCreate(BaseModel):
    environment_id: UUID
    commit_sha: str | None = None
    branch: str | None = None
    platform: str | None = None


class DeploymentUpdate(BaseModel):
    status: str | None = None
    commit_sha: str | None = None
    branch: str | None = None
    platform: str | None = None
    logs: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    duration_seconds: int | None = None


class DeploymentResponse(BaseModel):
    id: UUID
    environment_id: UUID
    commit_sha: str | None
    branch: str | None
    status: str
    platform: str | None
    logs: str | None
    started_at: datetime | None
    completed_at: datetime | None
    duration_seconds: int | None
    deployment_url: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
