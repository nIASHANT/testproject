from sqlalchemy.orm import Session
from app.core.security import verify_password, create_access_token
from app.core.security import hash_password
from app.models.user import User
from app.repositories.user_repository import (
    create_user,
    get_user_by_email,
)
from app.schemas.user import UserCreate


def register_user(db: Session, user_data: UserCreate):

    existing_user = get_user_by_email(db, user_data.email)

    if existing_user:
        raise ValueError("Email already registered")

    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        password_hash=hash_password(user_data.password),
    )

    return create_user(db, user)


def login_user(db: Session, email: str, password: str):

    user = get_user_by_email(db, email)

    if not user:
        raise ValueError("Invalid email or password")

    if not verify_password(password, user.password_hash):
        raise ValueError("Invalid email or password")

    token = create_access_token(
        {
            "sub": str(user.id),
            "role": user.role,
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer",
    }
