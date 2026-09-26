from fastapi import Depends, HTTPException, status

from app.core.security import get_current_user
from app.models.user import User


ROLE_ADMIN = "admin"
ROLE_OPERATOR = "operator"
ROLE_READER = "reader"

VALID_ROLES = {
    ROLE_ADMIN,
    ROLE_OPERATOR,
    ROLE_READER,
}


def require_roles(*allowed_roles: str):
    def role_checker(
        current_user: User = Depends(get_current_user),
    ) -> User:
        if not current_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is inactive",
            )

        if current_user.role not in VALID_ROLES:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid user role",
            )

        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )

        return current_user

    return role_checker


require_admin = require_roles(
    ROLE_ADMIN,
)

require_operator = require_roles(
    ROLE_ADMIN,
    ROLE_OPERATOR,
)

require_reader = require_roles(
    ROLE_ADMIN,
    ROLE_OPERATOR,
    ROLE_READER,
)
