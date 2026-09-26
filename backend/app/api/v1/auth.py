from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.models.user import User

from app.db.session import get_db

from app.schemas.user import UserCreate, UserResponse
from app.schemas.auth import Token
from fastapi.security import OAuth2PasswordRequestForm

from app.services.auth_service import (
    register_user,
    login_user,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse)
def register(
    user: UserCreate,
    db: Session = Depends(get_db),
):
    try:
        return register_user(db, user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    try:
        return login_user(
            db,
            form_data.username,
            form_data.password,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=401,
            detail=str(e),
        )

@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user
