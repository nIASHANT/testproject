from sqlalchemy.orm import Session

from app.services.github_service import validate_github_repository
from app.models.repository import Repository
from app.models.user import User

from app.repositories.project_repository import get_project_by_id
from app.repositories.repository_repository import (
    create_repository,
    get_repository_by_project,
    get_repository_by_id,
    update_repository,
    delete_repository,
)

from app.schemas.repository import (
    RepositoryCreate,
    RepositoryUpdate,
)


def _can_access_project(
    project,
    current_user: User,
) -> bool:
    if project is None:
        return False

    return current_user.role in {
        "admin",
        "operator",
        "reader",
    }


def connect_repository(
    db: Session,
    repository_data: RepositoryCreate,
    current_user: User,
):
    project = get_project_by_id(
        db,
        repository_data.project_id,
    )

    if project is None:
        raise ValueError("Project not found")

    if not _can_access_project(project, current_user):
        raise ValueError("You don't have access to this project")

    existing = get_repository_by_project(
        db,
        repository_data.project_id,
    )

    if existing:
        raise ValueError("Repository already connected")

    validate_github_repository(
        repository_data.repo_url,
        repository_data.branch,
    )

    repository = Repository(
        project_id=repository_data.project_id,
        repo_url=repository_data.repo_url,
        branch=repository_data.branch,
        provider="github",
    )

    return create_repository(db, repository)


def validate_repository(
    db: Session,
    repository_id,
    current_user: User,
):
    repository = get_repository_by_id(
        db,
        repository_id,
    )

    if repository is None:
        raise ValueError("Repository not found")

    project = get_project_by_id(
        db,
        repository.project_id,
    )

    if not _can_access_project(project, current_user):
        raise ValueError("You don't have access to this repository")

    return {
        "valid": True,
        "message": "Repository is valid",
        "repo_url": repository.repo_url,
        "branch": repository.branch,
    }


def get_repository_details(
    db: Session,
    repository_id,
    current_user: User,
):
    repository = get_repository_by_id(
        db,
        repository_id,
    )

    if repository is None:
        raise ValueError("Repository not found")

    project = get_project_by_id(
        db,
        repository.project_id,
    )

    if not _can_access_project(project, current_user):
        raise ValueError("You don't have access to this repository")

    return repository


def update_repository_details(
    db: Session,
    repository_id,
    repository_data: RepositoryUpdate,
    current_user: User,
):
    repository = get_repository_by_id(
        db,
        repository_id,
    )

    if repository is None:
        raise ValueError("Repository not found")

    project = get_project_by_id(
        db,
        repository.project_id,
    )

    if not _can_access_project(project, current_user):
        raise ValueError("You don't have access to this repository")

    return update_repository(
        db,
        repository,
        repository_data.repo_url,
        repository_data.branch,
    )


def delete_repository_details(
    db: Session,
    repository_id,
    current_user: User,
):
    repository = get_repository_by_id(
        db,
        repository_id,
    )

    if repository is None:
        raise ValueError("Repository not found")

    project = get_project_by_id(
        db,
        repository.project_id,
    )

    if not _can_access_project(project, current_user):
        raise ValueError("You don't have access to this repository")

    delete_repository(
        db,
        repository,
    )

    return {
        "message": "Repository deleted successfully"
    }
