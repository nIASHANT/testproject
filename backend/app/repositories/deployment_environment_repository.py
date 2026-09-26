from uuid import UUID

from sqlalchemy.orm import Session

from app.models.deployment_environment import DeploymentEnvironment


def create_environment(
    db: Session,
    environment: DeploymentEnvironment,
):
    db.add(environment)
    db.commit()
    db.refresh(environment)
    return environment


def get_environment_by_id(
    db: Session,
    environment_id: UUID,
):
    return (
        db.query(DeploymentEnvironment)
        .filter(DeploymentEnvironment.id == environment_id)
        .first()
    )


def get_environments_by_project(
    db: Session,
    project_id: UUID,
):
    return (
        db.query(DeploymentEnvironment)
        .filter(
            DeploymentEnvironment.project_id == project_id
        )
        .order_by(DeploymentEnvironment.created_at)
        .all()
    )


def update_environment(
    db: Session,
    environment: DeploymentEnvironment,
):
    db.commit()
    db.refresh(environment)
    return environment


def delete_environment(
    db: Session,
    environment: DeploymentEnvironment,
):
    db.delete(environment)
    db.commit()
