from uuid import UUID

from sqlalchemy.orm import Session

from app.models.deployment_environment import DeploymentEnvironment
from app.repositories.deployment_environment_repository import (
    create_environment,
    get_environment_by_id,
    get_environments_by_project,
    update_environment,
    delete_environment,
)
from app.repositories.project_repository import get_project_by_id
from app.schemas.deployment_environment import (
    DeploymentEnvironmentCreate,
    DeploymentEnvironmentUpdate,
)


VALID_STATUSES = {"active", "inactive"}


def create_deployment_environment(
    db: Session,
    data: DeploymentEnvironmentCreate,
):
    project = get_project_by_id(db, data.project_id)

    if not project:
        raise ValueError("Project not found")

    if data.status not in VALID_STATUSES:
        raise ValueError("Invalid environment status")

    environment = DeploymentEnvironment(
    project_id=data.project_id,
    name=data.name,
    repository_url=data.repository_url,
    branch=data.branch,
    platform=data.platform,
    status=data.status,
    variables=data.variables,
)

    return create_environment(db, environment)


def list_project_environments(
    db: Session,
    project_id: UUID,
):
    project = get_project_by_id(db, project_id)

    if not project:
        raise ValueError("Project not found")

    return get_environments_by_project(db, project_id)


def get_deployment_environment(
    db: Session,
    environment_id: UUID,
):
    environment = get_environment_by_id(
        db,
        environment_id,
    )

    if not environment:
        raise ValueError("Environment not found")

    return environment


def update_deployment_environment(
    db: Session,
    environment_id: UUID,
    data: DeploymentEnvironmentUpdate,
):
    environment = get_environment_by_id(
        db,
        environment_id,
    )

    if not environment:
        raise ValueError("Environment not found")

    if data.status is not None:
        if data.status not in VALID_STATUSES:
            raise ValueError("Invalid environment status")
        environment.status = data.status

    if data.name is not None:
        environment.name = data.name

    if data.branch is not None:
        environment.branch = data.branch

    if data.platform is not None:
        environment.platform = data.platform
        
    if data.repository_url is not None:
        environment.repository_url = data.repository_url

    

    if data.variables is not None:
        environment.variables = data.variables

    return update_environment(db, environment)


def delete_deployment_environment(
    db: Session,
    environment_id: UUID,
):
    environment = get_environment_by_id(
        db,
        environment_id,
    )

    if not environment:
        raise ValueError("Environment not found")

    delete_environment(db, environment)

    return {
        "message": "Deployment environment deleted successfully"
    }
