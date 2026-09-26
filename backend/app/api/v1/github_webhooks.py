
import hashlib
import hmac
import json

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

#from app.config import settings
from app.core.config import settings
from app.db.session import get_db
from app.models.deployment_environment import DeploymentEnvironment
from app.services.deployment_crud_service import create_new_deployment
from app.schemas.deployment import DeploymentCreate
from app.tasks import run_deployment_task
#from typing import Any
from app.tasks import run_deployment_task

router = APIRouter(
    prefix="/webhooks",
    tags=["Webhooks"],
)


@router.post("/github")
async def github_webhook(
    request: Request,
    payload: dict,
    x_github_event: str | None = Header(default=None),
    x_hub_signature_256: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    body = await request.body()

    if not x_hub_signature_256:
        raise HTTPException(
            status_code=401,
            detail="Missing GitHub webhook signature",
        )

    expected_signature = "sha256=" + hmac.new(
        settings.GITHUB_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(
        x_hub_signature_256,
        expected_signature,
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid GitHub webhook signature",
        )

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=400,
            detail="Invalid GitHub webhook payload",
        )
    
    if x_github_event != "push":
        return {
            "message": "Event ignored",
            "event": x_github_event,
        }

    repository = payload.get("repository", {})

    repository = payload.get("repository", {})
    repo_url = repository.get("html_url")

    branch_ref = payload.get("ref")

    if not repo_url or not branch_ref:
        raise HTTPException(
            status_code=400,
            detail="Invalid GitHub webhook payload",
        )

    branch = branch_ref.removeprefix("refs/heads/")

    environment = (
        db.query(DeploymentEnvironment)
        .filter(
            DeploymentEnvironment.repository_url == repo_url,
            DeploymentEnvironment.branch == branch,
            DeploymentEnvironment.status == "active",
        )
        .first()
    )

    if not environment:
        return {
            "message": "No matching deployment environment found",
            "repository": repo_url,
            "branch": branch,
        }

    deployment_data = DeploymentCreate(
        environment_id=environment.id,
        commit_sha=None,
        branch=branch,
        platform=environment.platform,
    )

    deployment = create_new_deployment(
        db,
        deployment_data,
    )

    run_deployment_task.delay(
        str(deployment.id)
    )

    return {
        "message": "Deployment triggered",
        "deployment_id": str(deployment.id),
        "repository": repo_url,
        "branch": branch,
    }

