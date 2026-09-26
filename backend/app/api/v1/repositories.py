from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session


from app.core.rbac import require_admin, require_reader, require_operator
from app.db.session import get_db
from app.models.user import User
from app.repositories.project_repository import get_project_by_id
from app.repositories.repository_repository import get_repository_by_project

from app.schemas.repository import (
    RepositoryCreate,
    RepositoryUpdate,
    RepositoryResponse,
)

from app.services.repository_service import (
    connect_repository,
    validate_repository,
    get_repository_details,
    update_repository_details,
    delete_repository_details,
)

from app.services.github_service import (
    get_github_repository_metadata,
    get_github_repository_contents,
    get_github_file_content,
)

from app.services.analysis_service import analyze_repository
from app.services.readme_service import generate_readme
from app.services.deployment_service import generate_deployment_plan




router = APIRouter(
    prefix="/repositories",
    tags=["Repositories"],
)


@router.post("", response_model=RepositoryResponse)
def create_repository(
    repository: RepositoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator),
):
    try:
        return connect_repository(
            db,
            repository,
            current_user,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )


@router.get("/project/{project_id}", response_model=RepositoryResponse)
def get_repository_by_project_endpoint(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reader),
):
    try:
        project = get_project_by_id(
            db,
            project_id,
        )

        if project is None:
            raise ValueError("Project not found")

        repository = get_repository_by_project(
            db,
            project_id,
        )

        if repository is None:
            raise ValueError("Repository not found")

        return repository

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )



@router.get("/{repository_id}/analyze")
def analyze_repository_endpoint(
    repository_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reader),
):
    try:
        repository = get_repository_details(
            db,
            repository_id,
            current_user,
        )

        return analyze_repository(
            repository.repo_url,
            repository.branch,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )



@router.get("/{repository_id}/validate")
def validate_repository_endpoint(
    repository_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reader),
):
    try:
        return validate_repository(
            db,
            repository_id,
            current_user,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )

@router.get("/{repository_id}/metadata")
def get_repository_metadata(
    repository_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reader),
):
    try:
        repository = get_repository_details(
            db,
            repository_id,
            current_user,
        )

        return get_github_repository_metadata(
            repository.repo_url,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )

@router.get("/{repository_id}/files")
def get_repository_files(
    repository_id: UUID,
    path: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reader),
):
    try:
        repository = get_repository_details(
            db,
            repository_id,
            current_user,
        )

        return get_github_repository_contents(
            repository.repo_url,
            path,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )


@router.get("/{repository_id}/file-content")
def get_repository_file_content(
    repository_id: UUID,
    path: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reader),
):
    try:
        repository = get_repository_details(
            db,
            repository_id,
            current_user,
        )

        return get_github_file_content(
            repository.repo_url,
            path,
            repository.branch,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )


@router.get("/{repository_id}", response_model=RepositoryResponse)
def get_repository(
    repository_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reader),
):
    try:
        return get_repository_details(
            db,
            repository_id,
            current_user,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )


@router.put("/{repository_id}", response_model=RepositoryResponse)
def update_repository(
    repository_id: UUID,
    repository: RepositoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator),
):
    try:
        return update_repository_details(
            db,
            repository_id,
            repository,
            current_user,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )

@router.delete("/{repository_id}")
def delete_repository_endpoint(
    repository_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    try:
        return delete_repository_details(
            db,
            repository_id,
            current_user,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )


@router.get("/{repository_id}/generate-readme")
def generate_repository_readme(
    repository_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reader),
):
    try:
        repository = get_repository_details(
            db,
            repository_id,
            current_user,
        )

        return generate_readme(
            repository.repo_url,
            repository.branch,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )


@router.get("/{repository_id}/generate-deployment-plan")
def generate_repository_deployment_plan(
    repository_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reader),
):
    try:
        repository = get_repository_details(
            db,
            repository_id,
            current_user,
        )

        return generate_deployment_plan(
            repository.repo_url,
            repository.branch,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )


