from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.auth import router as auth_router
from app.api.v1.projects import router as project_router
from app.api.v1.repositories import router as repository_router
from app.api.v1.project_files import router as project_file_router

# Import models so SQLAlchemy knows about them
from app.models.project_file import ProjectFile
from app.db import base
from app.api.v1.users import router as user_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.deployment_environments import (
    router as deployment_environment_router,
)

from app.api.v1.deployments import router as deployment_router
from app.api.v1.github_webhooks import router as github_webhook_router



app = FastAPI(
    title="ReleaseForge",
    version="0.1.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(project_router)
app.include_router(repository_router)
app.include_router(project_file_router)
app.include_router(user_router)
app.include_router(dashboard_router)
app.include_router(deployment_environment_router)
app.include_router(deployment_router)
app.include_router(github_webhook_router)

@app.get("/")
def root():
    return {
        "message": "ReleaseForge API Running"
    }
