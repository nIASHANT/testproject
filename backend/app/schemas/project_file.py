from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ProjectFileResponse(BaseModel):
    id: UUID
    project_id: UUID
    original_filename: str
    content_type: str | None
    size: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
