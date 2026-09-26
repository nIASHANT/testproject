from uuid import UUID

from sqlalchemy.orm import Session

from app.models.deployment import Deployment


def create_deployment(db: Session, deployment: Deployment):
    db.add(deployment)
    db.commit()
    db.refresh(deployment)
    return deployment


def get_deployment_by_id(db: Session, deployment_id: UUID):
    return (
        db.query(Deployment)
        .filter(Deployment.id == deployment_id)
        .first()
    )


def get_deployments_by_environment(
    db: Session,
    environment_id: UUID,
):
    return (
        db.query(Deployment)
        .filter(Deployment.environment_id == environment_id)
        .order_by(Deployment.created_at.desc())
        .all()
    )


def update_deployment(db: Session, deployment: Deployment):
    db.commit()
    db.refresh(deployment)
    return deployment


def delete_deployment(db: Session, deployment: Deployment):
    db.delete(deployment)
    db.commit()
