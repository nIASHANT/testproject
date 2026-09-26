from sqlalchemy.orm import Session

from app.models.repository import Repository


def create_repository(db: Session, repository: Repository):
    db.add(repository)
    db.commit()
    db.refresh(repository)
    return repository


def get_repository_by_project(db: Session, project_id):
    return (
        db.query(Repository)
        .filter(Repository.project_id == project_id)
        .first()
    )


def get_repository_by_id(db: Session, repository_id):
    return (
        db.query(Repository)
        .filter(Repository.id == repository_id)
        .first()
    )


def update_repository(
    db: Session,
    repository: Repository,
    repo_url: str,
    branch: str,
):
    repository.repo_url = repo_url
    repository.branch = branch

    db.commit()
    db.refresh(repository)

    return repository


def delete_repository(
    db: Session,
    repository: Repository,
):
    db.delete(repository)
    db.commit()

    return True
