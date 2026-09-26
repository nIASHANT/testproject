from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.rbac import require_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import (
    AdminUserCreate,
    UserResponse,
    UserUpdate,
)
from app.services.user_service import (
    create_admin_user,
    delete_existing_user,
    get_user,
    list_users,
    update_existing_user,
)

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=list[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return list_users(db)


@router.post("", response_model=UserResponse)
def create_user(
    user_data: AdminUserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    try:
        return create_admin_user(db, user_data)
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )


@router.get("/{user_id}", response_model=UserResponse)
def get_single_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = get_user(db, user_id)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    return user


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: UUID,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    try:
        user = update_existing_user(
            db,
            user_id,
            user_data,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    return user


@router.delete("/{user_id}")
def delete_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    user = get_user(db, user_id)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    if user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own account",
        )

    delete_existing_user(db, user_id)

    return {"message": "User deleted successfully"}
