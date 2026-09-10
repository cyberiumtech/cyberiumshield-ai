"""Authentication dependencies for FastAPI."""
from typing import Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import User
from app.core.security import decode_token, verify_token_type

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get current authenticated user from JWT token.

    Args:
        credentials: HTTP Bearer credentials
        db: Database session

    Returns:
        Current authenticated user

    Raises:
        HTTPException: If token is invalid or user not found
    """
    token = credentials.credentials

    # Decode token
    payload = decode_token(token)
    if not payload or not verify_token_type(payload, "access"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user ID from token
    subject = payload.get("sub")
    if subject is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = int(subject)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None

    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )

    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency to get current active user.

    Args:
        current_user: Current user from get_current_user

    Returns:
        Active user

    Raises:
        HTTPException: If user is not active or verified
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )

    return current_user


def require_role(allowed_roles: List[str]):
    """
    Dependency factory to require specific roles.

    Args:
        allowed_roles: List of allowed role names

    Returns:
        Dependency function that checks user roles
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_roles = [role.name for role in current_user.roles]

        if not any(role in allowed_roles for role in user_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {', '.join(allowed_roles)}"
            )

        return current_user

    return role_checker


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to require admin role.

    Args:
        current_user: Current user

    Returns:
        User if they have admin role

    Raises:
        HTTPException: If user is not admin
    """
    user_roles = [role.name for role in current_user.roles]

    if "admin" not in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    return current_user


def require_permission(required_permission: str):
    """
    Dependency factory to require specific permission.

    Args:
        required_permission: Required permission name (e.g., 'view:users')

    Returns:
        Dependency function that checks user permissions
    """
    def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        # Get all permissions from user's roles
        user_permissions = []
        for role in current_user.roles:
            user_permissions.extend([perm.name for perm in role.permissions])

        if required_permission not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required: {required_permission}"
            )

        return current_user

    return permission_checker


# Optional user dependency (doesn't raise exception if not authenticated)
def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Dependency to get current user if authenticated, None otherwise.

    Args:
        credentials: Optional HTTP Bearer credentials
        db: Database session

    Returns:
        User if authenticated, None otherwise
    """
    if not credentials:
        return None

    try:
        return get_current_user(credentials, db)
    except HTTPException:
        return None
