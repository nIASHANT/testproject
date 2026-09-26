import shutil
from pathlib import Path
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.user import User
from app.repositories.project_repository import (
    create_project,
    delete_project,
    get_project_by_id,
    get_projects_by_owner,
)
from app.schemas.project import ProjectCreate


UPLOAD_DIR = Path("uploads")


def create_new_project(
    db: Session,
    project_data: ProjectCreate,
    current_user: User,
):
    project = Project(
        name=project_data.name,
        description=project_data.description,
        owner_id=current_user.id,
    )

    return create_project(db, project)


def list_my_projects(
    db: Session,
    current_user: User,
):
    # Admins and operators can see all projects.
    if current_user.role in {"admin", "operator"}:
        return db.query(Project).all()

    # Readers can also view projects, but remain read-only.
    if current_user.role == "reader":
        return db.query(Project).all()

    return []


def delete_my_project(
    db: Session,
    project_id: UUID,
    current_user: User,
):
    project = get_project_by_id(db, project_id)

    if not project:
        return False

    # Admin can delete any project.
    if current_user.role != "admin":
        return False

    # Delete connected repository first because its FK
    # does not currently have ON DELETE CASCADE.
    if project.repository:
        db.delete(project.repository)

    # ProjectFile rows are removed through the relationship cascade.
    # Remove physical uploaded files from disk as well.
    project_upload_dir = UPLOAD_DIR / str(project.id)

    if project_upload_dir.exists():
        shutil.rmtree(project_upload_dir)

    db.delete(project)
    db.commit()

    return True
