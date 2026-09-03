"""User management endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import User
from app.api.dependencies.auth import get_current_user, require_admin, require_role
from app.schemas.auth import UserResponse

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user information.

    Requires: Valid access token
    """
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        roles=[role.name for role in current_user.roles],
        created_at=current_user.created_at,
    )


@router.get("/admin-only")
async def admin_only_endpoint(
    current_user: User = Depends(require_admin)
):
    """
    Example admin-only endpoint.

    Requires: Valid access token + admin role
    """
    return {
        "message": "You have admin access!",
        "user": current_user.username
    }


@router.get("/analyst-or-admin")
async def analyst_or_admin_endpoint(
    current_user: User = Depends(require_role(["admin", "analyst"]))
):
    """
    Example endpoint for analysts and admins.

    Requires: Valid access token + (analyst OR admin role)
    """
    return {
        "message": "You have analyst or admin access!",
        "user": current_user.username,
        "roles": [role.name for role in current_user.roles]
    }
