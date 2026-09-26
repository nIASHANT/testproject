from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.rbac import require_admin, require_reader
from app.db.session import get_db
from app.models.user import User
from app.schemas.deployment_environment import (
    DeploymentEnvironmentCreate,
    DeploymentEnvironmentUpdate,
    DeploymentEnvironmentResponse,
)
from app.services.deployment_environment_service import (
    create_deployment_environment,
    list_project_environments,
    get_deployment_environment,
    update_deployment_environment,
    delete_deployment_environment,
)


router = APIRouter(
    prefix="/deployment-environments",
    tags=["Deployment Environments"],
)


@router.post(
    "",
    response_model=DeploymentEnvironmentResponse,
)
def create_environment(
    data: DeploymentEnvironmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    try:
        return create_deployment_environment(db, data)
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )


@router.get(
    "/project/{project_id}",
    response_model=list[DeploymentEnvironmentResponse],
)
def list_environments(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reader),
):
    try:
        return list_project_environments(db, project_id)
    except ValueError as e:
        raise HTTPException(
            status_code=404,
            detail=str(e),
        )


@router.get(
    "/{environment_id}",
    response_model=DeploymentEnvironmentResponse,
)
def get_environment(
    environment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reader),
):
    try:
        return get_deployment_environment(
            db,
            environment_id,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=404,
            detail=str(e),
        )


@router.put(
    "/{environment_id}",
    response_model=DeploymentEnvironmentResponse,
)
def update_environment(
    environment_id: UUID,
    data: DeploymentEnvironmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    try:
        return update_deployment_environment(
            db,
            environment_id,
            data,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )


@router.delete("/{environment_id}")
def delete_environment(
    environment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    try:
        return delete_deployment_environment(
            db,
            environment_id,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=404,
            detail=str(e),
        )
