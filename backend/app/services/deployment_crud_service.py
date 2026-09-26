from uuid import UUID

from sqlalchemy.orm import Session

from app.models.deployment import Deployment
from app.models.deployment_environment import DeploymentEnvironment
from app.repositories.deployment_repository import (
    create_deployment,
    delete_deployment,
    get_deployment_by_id,
    get_deployments_by_environment,
    update_deployment,
)
from app.services.github_service import get_latest_commit_sha

VALID_STATUSES = {
    "queued",
    "building",
    "deploying",
    "success",
    "failed",
}


def create_new_deployment(db: Session, deployment_data):
    environment = (
        db.query(DeploymentEnvironment)
        .filter(
            DeploymentEnvironment.id
            == deployment_data.environment_id
        )
        .first()
    )

    if not environment:
        raise ValueError("Deployment environment not found")

    branch = (
        deployment_data.branch
        or environment.branch
        or "main"
    )
    commit_sha = deployment_data.commit_sha

    if not commit_sha:
        if not environment.repository_url:
            raise ValueError(
                "Repository URL is not configured "
                "for this deployment environment"
            )
        commit_sha = get_latest_commit_sha(
            environment.repository_url,
            branch
        )

    deployment = Deployment(
        environment_id=deployment_data.environment_id,
        commit_sha=commit_sha,
        branch=branch,
        platform=deployment_data.platform or environment.platform,
        status="queued",
    )

    return create_deployment(db, deployment)


def list_environment_deployments(
    db: Session,
    environment_id: UUID,
):
    environment = (
        db.query(DeploymentEnvironment)
        .filter(DeploymentEnvironment.id == environment_id)
        .first()
    )

    if not environment:
        raise ValueError("Deployment environment not found")

    return get_deployments_by_environment(db, environment_id)


def get_deployment(db: Session, deployment_id: UUID):
    return get_deployment_by_id(db, deployment_id)


def update_existing_deployment(
    db: Session,
    deployment_id: UUID,
    deployment_data,
):
    deployment = get_deployment_by_id(db, deployment_id)

    if not deployment:
        return None

    if deployment_data.status is not None:
        if deployment_data.status not in VALID_STATUSES:
            raise ValueError("Invalid deployment status")

        deployment.status = deployment_data.status

    if deployment_data.commit_sha is not None:
        deployment.commit_sha = deployment_data.commit_sha

    if deployment_data.branch is not None:
        deployment.branch = deployment_data.branch

    if deployment_data.platform is not None:
        deployment.platform = deployment_data.platform

    if deployment_data.logs is not None:
        deployment.logs = deployment_data.logs

    if deployment_data.started_at is not None:
        deployment.started_at = deployment_data.started_at

    if deployment_data.completed_at is not None:
        deployment.completed_at = deployment_data.completed_at

    if deployment_data.duration_seconds is not None:
        deployment.duration_seconds = (
            deployment_data.duration_seconds
        )

    return update_deployment(db, deployment)


def delete_existing_deployment(
    db: Session,
    deployment_id: UUID,
):
    deployment = get_deployment_by_id(db, deployment_id)

    if not deployment:
        return None

    delete_deployment(db, deployment)

    return True

def redeploy_deployment(
    db: Session,
    deployment_id: UUID,
):
    existing_deployment = get_deployment_by_id(
        db,
        deployment_id,
    )

    if not existing_deployment:
        return None

    environment = (
        db.query(DeploymentEnvironment)
        .filter(
            DeploymentEnvironment.id
            == existing_deployment.environment_id
        )
        .first()
    )

    if not environment:
        raise ValueError(
            "Deployment environment not found"
        )

    if not environment.repository_url:
        raise ValueError(
            "Repository URL is not configured "
            "for this deployment environment"
        )

    deployment = Deployment(
        environment_id=existing_deployment.environment_id,
        commit_sha=existing_deployment.commit_sha,
        branch=existing_deployment.branch or environment.branch,
        platform=existing_deployment.platform or environment.platform,
        status="queued",
    )

    return create_deployment(
        db,
        deployment,
    )
