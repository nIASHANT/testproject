import os
import uuid
from pathlib import Path
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File as FastAPIFile,
    HTTPException,
    UploadFile,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.rbac import require_admin, require_reader, require_operator
from app.db.session import get_db
from app.models.user import User
from app.models.project import Project
from app.models.project_file import ProjectFile
from app.schemas.project_file import ProjectFileResponse


router = APIRouter(
    prefix="/projects",
    tags=["Project Files"],
)


UPLOAD_DIR = Path("uploads")

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


def get_user_project(
    db: Session,
    project_id: UUID,
    current_user: User,
):
    project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
        )
        .first()
    )

    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found",
        )

    return project


@router.post(
    "/{project_id}/files",
    response_model=ProjectFileResponse,
)
async def upload_project_file(
    project_id: UUID,
    file: UploadFile = FastAPIFile(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator),
):
    get_user_project(
        db,
        project_id,
        current_user,
    )

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Filename is required",
        )

    project_directory = UPLOAD_DIR / str(project_id)
    project_directory.mkdir(
        parents=True,
        exist_ok=True,
    )

    safe_filename = Path(file.filename).name

    stored_filename = (
        f"{uuid.uuid4().hex}_{safe_filename}"
    )

    file_path = project_directory / stored_filename

    total_size = 0

    try:
        with open(file_path, "wb") as output_file:
            while True:
                chunk = await file.read(1024 * 1024)

                if not chunk:
                    break

                total_size += len(chunk)

                if total_size > MAX_FILE_SIZE:
                    output_file.close()

                    if file_path.exists():
                        file_path.unlink()

                    raise HTTPException(
                        status_code=413,
                        detail="File size cannot exceed 50 MB",
                    )

                output_file.write(chunk)

    except HTTPException:
        raise

    except Exception as e:
        if file_path.exists():
            file_path.unlink()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to save file: {str(e)}",
        )

    project_file = ProjectFile(
        project_id=project_id,
        original_filename=safe_filename,
        stored_filename=stored_filename,
        content_type=file.content_type,
        size=total_size,
        storage_path=str(file_path),
    )

    db.add(project_file)
    db.commit()
    db.refresh(project_file)

    return project_file


@router.get(
    "/{project_id}/files",
    response_model=list[ProjectFileResponse],
)
def list_project_files(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reader),
):
    get_user_project(
        db,
        project_id,
        current_user,
    )

    return (
        db.query(ProjectFile)
        .filter(
            ProjectFile.project_id == project_id
        )
        .order_by(ProjectFile.created_at.desc())
        .all()
    )


@router.get(
    "/{project_id}/files/{file_id}/download"
)
def download_project_file(
    project_id: UUID,
    file_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reader),
):
    get_user_project(
        db,
        project_id,
        current_user,
    )

    project_file = (
        db.query(ProjectFile)
        .filter(
            ProjectFile.id == file_id,
            ProjectFile.project_id == project_id,
        )
        .first()
    )

    if not project_file:
        raise HTTPException(
            status_code=404,
            detail="File not found",
        )

    file_path = Path(project_file.storage_path)

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Physical file not found",
        )

    return FileResponse(
        path=file_path,
        filename=project_file.original_filename,
        media_type=project_file.content_type
        or "application/octet-stream",
    )


@router.delete(
    "/{project_id}/files/{file_id}"
)
def delete_project_file(
    project_id: UUID,
    file_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    get_user_project(
        db,
        project_id,
        current_user,
    )

    project_file = (
        db.query(ProjectFile)
        .filter(
            ProjectFile.id == file_id,
            ProjectFile.project_id == project_id,
        )
        .first()
    )

    if not project_file:
        raise HTTPException(
            status_code=404,
            detail="File not found",
        )

    file_path = Path(project_file.storage_path)

    if file_path.exists():
        file_path.unlink()

    db.delete(project_file)
    db.commit()

    return {
        "message": "File deleted successfully"
    }
