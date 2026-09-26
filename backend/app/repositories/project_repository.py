from sqlalchemy.orm import Session

from app.models.project import Project


def create_project(db: Session, project: Project):
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def get_projects_by_owner(db: Session, owner_id: str):
    return (
        db.query(Project)
        .filter(Project.owner_id == owner_id)
        .all()
    )


def get_project_by_id(db: Session, project_id: str):
    return (
        db.query(Project)
        .filter(Project.id == project_id)
        .first()
    )


def delete_project(db: Session, project: Project):
    db.delete(project)
    db.commit()
