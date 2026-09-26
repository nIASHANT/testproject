from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.rbac import require_admin, require_reader, require_operator
from app.db.session import get_db
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectResponse
from app.services.project_service import (
    create_new_project,
    list_my_projects,
    delete_my_project,
)

router = APIRouter(
    prefix="/projects",
    tags=["Projects"],
)


@router.post("", response_model=ProjectResponse)
def create_project(
    project: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator),
):
    return create_new_project(db, project, current_user)


@router.get("", response_model=list[ProjectResponse])
def get_my_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reader),
):
    return list_my_projects(db, current_user)


@router.delete("/{project_id}")
def delete_project_endpoint(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    deleted = delete_my_project(
        db,
        project_id,
        current_user,
    )

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Project not found",
        )

    return {
        "message": "Project deleted successfully"
    }
