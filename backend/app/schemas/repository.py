from uuid import UUID

from pydantic import BaseModel, ConfigDict


class RepositoryCreate(BaseModel):
    project_id: UUID
    repo_url: str
    branch: str = "main"


class RepositoryUpdate(BaseModel):
    repo_url: str
    branch: str = "main"


class RepositoryResponse(BaseModel):
    id: UUID
    project_id: UUID
    repo_url: str
    branch: str
    provider: str

    model_config = ConfigDict(from_attributes=True)
