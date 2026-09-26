from uuid import UUID

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User
from app.repositories.user_repository import (
    create_user,
    delete_user,
    get_all_users,
    get_user_by_email,
    get_user_by_id,
    update_user,
)
from app.schemas.user import AdminUserCreate, UserUpdate


VALID_ROLES = {"admin", "operator", "reader"}


def list_users(db: Session):
    return get_all_users(db)


def create_admin_user(
    db: Session,
    user_data: AdminUserCreate,
):
    if user_data.role not in VALID_ROLES:
        raise ValueError("Invalid role")

    if get_user_by_email(db, user_data.email):
        raise ValueError("Email already registered")

    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        password_hash=hash_password(user_data.password),
        role=user_data.role,
        is_active=True,
    )

    return create_user(db, user)


def get_user(db: Session, user_id: UUID):
    return get_user_by_id(db, user_id)


def update_existing_user(
    db: Session,
    user_id: UUID,
    user_data: UserUpdate,
):
    user = get_user_by_id(db, user_id)

    if not user:
        return None

    if user_data.role is not None:
        if user_data.role not in VALID_ROLES:
            raise ValueError("Invalid role")
        user.role = user_data.role

    if user_data.full_name is not None:
        user.full_name = user_data.full_name

    if user_data.is_active is not None:
        user.is_active = user_data.is_active

    return update_user(db, user)


def delete_existing_user(
    db: Session,
    user_id: UUID,
):
    user = get_user_by_id(db, user_id)

    if not user:
        return None

    delete_user(db, user)

    return True
