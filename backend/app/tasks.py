from app.celery_app import celery_app

# Load all SQLAlchemy models so relationships are registered
from app.db import base

from app.services.deployment_engine import run_deployment


@celery_app.task(
    name="releaseforge.run_deployment",
)
def run_deployment_task(deployment_id: str):
    run_deployment(deployment_id)

    return {
        "deployment_id": deployment_id,
        "status": "completed",
    }
