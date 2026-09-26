from datetime import datetime

from app.db.session import SessionLocal
from app.models.deployment import Deployment
from app.services.docker_deployment_service import (
    DockerDeploymentError,
    cleanup_docker_resources,
    deploy_repository,
)

def update_deployment_log(
    db,
    deployment,
    message: str,
):
    deployment.logs = (deployment.logs or "") + message + "\n"
    db.commit()



def run_deployment(deployment_id):
    db = SessionLocal()

    try:
        deployment = (
            db.query(Deployment)
            .filter(Deployment.id == deployment_id)
            .first()
        )

        if not deployment:
            return

        environment = deployment.environment

        if not environment:
            raise DockerDeploymentError(
                "Deployment environment not found"
            )

        repository_url = environment.repository_url

        if not repository_url:
            raise DockerDeploymentError(
                "Repository URL is not configured "
                "for this deployment environment"
            )

        branch = deployment.branch or environment.branch or "main"

        started_at = datetime.utcnow()

        deployment.started_at = started_at
        deployment.status = "building"
        deployment.logs = (
            "Deployment started.\n"
            f"Repository: {repository_url}\n"
            f"Branch: {branch}\n"
            "Preparing deployment...\n"
        )
        db.commit()

        result = deploy_repository(
            repository_url=repository_url,
            branch=branch,
            deployment_id=str(deployment.id),
            log_callback=lambda msg: update_deployment_log(
                db, deployment, msg
            ),
        )

        deployment.status = "success"

        deployment.deployment_url = result["url"]
        deployment.image_name = result["image"]
        deployment.container_name = result["container"]
        deployment.container_id = result["container_id"]

        deployment.logs = (
            (deployment.logs or "")
            + result["logs"]
            + f"Image: {result['image']}\n"
            + f"Container: {result['container']}\n"
            + f"Container ID: {result['container_id']}\n"
            + f"URL: {result['url']}\n"
        )

        completed_at = datetime.utcnow()

        deployment.completed_at = completed_at

        duration = completed_at - started_at

        deployment.duration_seconds = int(
            duration.total_seconds()
        )

        # New deployment is saved successfully first.
        db.commit()

        # Find the immediately previous successful deployment
        # in the same environment.
        previous_deployment = (
            db.query(Deployment)
            .filter(
                Deployment.environment_id
                == deployment.environment_id,
                Deployment.id != deployment.id,
                Deployment.status == "success",
                Deployment.container_name.isnot(None),
            )
            .order_by(Deployment.created_at.desc())
            .first()
        )

        # Only clean old resources after the new deployment
        # is healthy and already saved as successful.
        if previous_deployment:
            try:
                cleanup_docker_resources(
                    container_name=previous_deployment.container_name,
                    image_name=previous_deployment.image_name,
                )

                deployment.logs = (
                    (deployment.logs or "")
                    + "Previous deployment resources cleaned up.\n"
                    + "Removed container: "
                    f"{previous_deployment.container_name}\n"
                    + "Removed image: "
                    f"{previous_deployment.image_name}\n"
                )

                db.commit()

            except Exception as cleanup_error:
                # Cleanup failure must not fail the new deployment.
                deployment.logs = (
                    (deployment.logs or "")
                    + "Previous deployment cleanup failed: "
                    f"{cleanup_error}\n"
                )
                db.commit()

    except Exception as exc:
        deployment = (
            db.query(Deployment)
            .filter(Deployment.id == deployment_id)
            .first()
        )

        if deployment:
            deployment.status = "failed"

            deployment.logs = (
                (deployment.logs or "")
                + f"Deployment failed: {exc}\n"
            )

            completed_at = datetime.utcnow()

            deployment.completed_at = completed_at

            if deployment.started_at:
                duration = (
                    completed_at
                    - deployment.started_at
                )

                deployment.duration_seconds = int(
                    duration.total_seconds()
                )

            db.commit()

    finally:
        db.close()
