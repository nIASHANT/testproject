from uuid import UUID

from pydantic import BaseModel, EmailStr


class DashboardCreator(BaseModel):
    user_id: UUID
    name: str
    email: EmailStr


class DashboardProjectStats(BaseModel):
    id: UUID
    name: str
    created_by: DashboardCreator
    file_count: int
    storage_bytes: int
    storage_mb: float


class DashboardUserStats(BaseModel):
    user_id: UUID
    name: str
    email: EmailStr
    project_count: int


class DashboardStatsResponse(BaseModel):
    total_users: int
    total_active_users: int
    total_projects: int
    total_files: int
    total_storage_bytes: int
    total_storage_mb: float

    projects: list[DashboardProjectStats]
    projects_by_user: list[DashboardUserStats]
