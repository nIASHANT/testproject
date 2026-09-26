from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.project_file import ProjectFile
from app.models.user import User


def get_dashboard_stats(db: Session):
    total_users = db.query(func.count(User.id)).scalar() or 0

    total_active_users = (
        db.query(func.count(User.id))
        .filter(User.is_active.is_(True))
        .scalar()
        or 0
    )

    total_projects = db.query(func.count(Project.id)).scalar() or 0

    total_files = db.query(func.count(ProjectFile.id)).scalar() or 0

    total_storage_bytes = (
        db.query(func.coalesce(func.sum(ProjectFile.size), 0)).scalar() or 0
    )

    # File statistics per project.
    file_stats = (
        db.query(
            ProjectFile.project_id.label("project_id"),
            func.count(ProjectFile.id).label("file_count"),
            func.coalesce(func.sum(ProjectFile.size), 0).label("storage_bytes"),
        )
        .group_by(ProjectFile.project_id)
        .subquery()
    )

    project_rows = (
        db.query(
            Project.id,
            Project.name,
            User.id.label("user_id"),
            User.full_name.label("user_name"),
            User.email.label("user_email"),
            func.coalesce(file_stats.c.file_count, 0).label("file_count"),
            func.coalesce(file_stats.c.storage_bytes, 0).label("storage_bytes"),
        )
        .join(User, User.id == Project.owner_id)
        .outerjoin(file_stats, file_stats.c.project_id == Project.id)
        .order_by(Project.name.asc())
        .all()
    )

    projects = []

    for row in project_rows:
        storage_bytes = int(row.storage_bytes or 0)

        projects.append(
            {
                "id": row.id,
                "name": row.name,
                "created_by": {
                    "user_id": row.user_id,
                    "name": row.user_name,
                    "email": row.user_email,
                },
                "file_count": int(row.file_count or 0),
                "storage_bytes": storage_bytes,
                "storage_mb": round(storage_bytes / (1024 * 1024), 2),
            }
        )

    # Project count per user.
    user_rows = (
        db.query(
            User.id,
            User.full_name,
            User.email,
            func.count(Project.id).label("project_count"),
        )
        .outerjoin(Project, Project.owner_id == User.id)
        .group_by(User.id, User.full_name, User.email)
        .order_by(func.count(Project.id).desc(), User.email.asc())
        .all()
    )

    projects_by_user = [
        {
            "user_id": row.id,
            "name": row.full_name,
            "email": row.email,
            "project_count": int(row.project_count or 0),
        }
        for row in user_rows
    ]

    return {
        "total_users": total_users,
        "total_active_users": total_active_users,
        "total_projects": total_projects,
        "total_files": total_files,
        "total_storage_bytes": int(total_storage_bytes),
        "total_storage_mb": round(
            int(total_storage_bytes) / (1024 * 1024),
            2,
        ),
        "projects": projects,
        "projects_by_user": projects_by_user,
    }
