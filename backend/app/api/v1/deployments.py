from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.rbac import require_admin, require_operator, require_reader
from app.db.session import get_db
from app.schemas.deployment import (
    DeploymentCreate,
    DeploymentResponse,
    DeploymentUpdate,
)
from app.services.deployment_crud_service import (
    create_new_deployment,
    delete_existing_deployment,
    get_deployment,
    list_environment_deployments,
    redeploy_deployment,
    update_existing_deployment,
)
from app.tasks import run_deployment_task


router = APIRouter(
    prefix="/deployments",
    tags=["Deployments"],
)


@router.post(
    "",
    response_model=DeploymentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create(
    deployment_data: DeploymentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_operator),
):
    try:
        deployment = create_new_deployment(
            db,
            deployment_data,
        )

        run_deployment_task.delay(
            str(deployment.id)
        )

        return deployment

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )


@router.get(
    "/environment/{environment_id}",
    response_model=list[DeploymentResponse],
)
def list_by_environment(
    environment_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_reader),
):
    try:
        return list_environment_deployments(
            db,
            environment_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )


@router.post(
    "/{deployment_id}/redeploy",
    response_model=DeploymentResponse,
    status_code=status.HTTP_201_CREATED,
)
def redeploy(
    deployment_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_operator),
):
    try:
        deployment = redeploy_deployment(
            db,
            deployment_id,
        )

        if not deployment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Deployment not found",
            )

        run_deployment_task.delay(
            str(deployment.id)
        )

        return deployment

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.get(
    "/{deployment_id}",
    response_model=DeploymentResponse,
)
def get(
    deployment_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_reader),
):
    deployment = get_deployment(
        db,
        deployment_id,
    )

    if not deployment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deployment not found",
        )

    return deployment


@router.put(
    "/{deployment_id}",
    response_model=DeploymentResponse,
)
def update(
    deployment_id: UUID,
    deployment_data: DeploymentUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_operator),
):
    try:
        deployment = update_existing_deployment(
            db,
            deployment_id,
            deployment_data,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    if not deployment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deployment not found",
        )

    return deployment


@router.delete(
    "/{deployment_id}",
)
def delete(
    deployment_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    deployment = delete_existing_deployment(
        db,
        deployment_id,
    )

    if not deployment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deployment not found",
        )

    return {
        "message": "Deployment deleted successfully"
    }
