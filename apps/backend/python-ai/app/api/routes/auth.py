"""Authentication API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address
import logging

from app.db.session import get_db
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    Token,
    TokenRefresh,
    PasswordResetRequest,
    PasswordReset,
    UserResponse,
)
from app.services.auth_service import AuthService

router = APIRouter()
security = HTTPBearer()
limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger(__name__)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/minute")
async def register(
    request: Request,
    user_data: UserRegister,
    db: Session = Depends(get_db)
):
    """
    Register a new user.

    Rate limit: 3 requests per minute per IP.
    """
    user = AuthService.register_user(db, user_data)

    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        is_active=user.is_active,
        is_verified=user.is_verified,
        roles=[role.name for role in user.roles],
        created_at=user.created_at,
    )


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login(
    request: Request,
    credentials: UserLogin,
    db: Session = Depends(get_db)
):
    """
    Authenticate user and return access and refresh tokens.

    Rate limit: 5 requests per minute per IP.
    """
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    user, access_token, refresh_token = AuthService.authenticate_user(
        db=db,
        credentials=credentials,
        ip_address=ip_address,
        user_agent=user_agent
    )

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )


@router.post("/refresh", response_model=dict)
@limiter.limit("10/minute")
async def refresh_token(
    request: Request,
    token_data: TokenRefresh,
    db: Session = Depends(get_db)
):
    """
    Refresh access token using refresh token.

    Rate limit: 10 requests per minute per IP.
    """
    access_token = AuthService.refresh_access_token(db, token_data.refresh_token)

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    token_data: TokenRefresh,
    db: Session = Depends(get_db)
):
    """
    Logout user by revoking refresh token.
    """
    AuthService.logout_user(db, token_data.refresh_token)
    return None


@router.post("/request-password-reset", status_code=status.HTTP_200_OK)
@limiter.limit("2/minute")
async def request_password_reset(
    request: Request,
    reset_request: PasswordResetRequest,
    db: Session = Depends(get_db)
):
    """
    Request password reset email.

    Rate limit: 2 requests per minute per IP.

    Note: Always returns success to prevent email enumeration.
    In dev mode, the token is logged to console.
    """
    AuthService.request_password_reset(db, reset_request.email)

    return {
        "message": "If the email exists, a password reset link has been sent."
    }


@router.post("/reset-password", status_code=status.HTTP_200_OK)
@limiter.limit("3/minute")
async def reset_password(
    request: Request,
    reset_data: PasswordReset,
    db: Session = Depends(get_db)
):
    """
    Reset password using reset token.

    Rate limit: 3 requests per minute per IP.
    """
    AuthService.reset_password(db, reset_data.token, reset_data.new_password)

    return {
        "message": "Password has been reset successfully."
    }
