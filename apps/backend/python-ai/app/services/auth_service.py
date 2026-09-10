"""Authentication service layer."""
from datetime import datetime, timedelta
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import logging

from app.db.models import User, RefreshToken, LoginAttempt, Role
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_token_type,
    create_password_reset_token_with_expiry,
    verify_password_strength,
)
from app.core.config import settings
from app.schemas.auth import UserRegister, UserLogin

logger = logging.getLogger(__name__)


class AuthService:
    """Service for authentication operations."""

    @staticmethod
    def register_user(db: Session, user_data: UserRegister) -> User:
        """
        Register a new user.

        Args:
            db: Database session
            user_data: User registration data

        Returns:
            Created user

        Raises:
            HTTPException: If email or username already exists
        """
        # Check if email already exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Check if username already exists
        existing_username = db.query(User).filter(User.username == user_data.username).first()
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )

        # Verify password strength
        is_valid, error_msg = verify_password_strength(user_data.password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )

        # Create new user
        user = User(
            email=user_data.email,
            username=user_data.username,
            full_name=user_data.full_name,
            hashed_password=get_password_hash(user_data.password),
            is_active=True,
            is_verified=False,  # Require email verification in production
        )

        # Assign default 'viewer' role
        default_role = db.query(Role).filter(Role.name == "viewer").first()
        if default_role:
            user.roles.append(default_role)

        db.add(user)
        db.commit()
        db.refresh(user)

        logger.info(f"New user registered: {user.email}")
        return user

    @staticmethod
    def authenticate_user(
        db: Session,
        credentials: UserLogin,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Tuple[User, str, str]:
        """
        Authenticate a user and return access/refresh tokens.

        Args:
            db: Database session
            credentials: Login credentials
            ip_address: Client IP address
            user_agent: Client user agent

        Returns:
            Tuple of (user, access_token, refresh_token)

        Raises:
            HTTPException: If authentication fails
        """
        # Find user by email
        user = db.query(User).filter(User.email == credentials.email).first()

        # Check if account is locked
        if user and user.locked_until and user.locked_until > datetime.utcnow():
            minutes_left = int((user.locked_until - datetime.utcnow()).total_seconds() / 60)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account is locked. Try again in {minutes_left} minutes."
            )

        # Verify password
        if not user or not verify_password(credentials.password, user.hashed_password):
            # Log failed attempt
            AuthService._log_login_attempt(
                db=db,
                email=credentials.email,
                user_id=user.id if user else None,
                success=False,
                ip_address=ip_address,
                user_agent=user_agent
            )

            # Increment failed attempts if user exists
            if user:
                user.failed_login_attempts += 1
                if user.failed_login_attempts >= settings.MAX_LOGIN_ATTEMPTS:
                    user.locked_until = datetime.utcnow() + timedelta(
                        minutes=settings.ACCOUNT_LOCKOUT_MINUTES
                    )
                    db.commit()
                    logger.warning(f"Account locked after {settings.MAX_LOGIN_ATTEMPTS} failed attempts: {user.email}")
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Account locked after {settings.MAX_LOGIN_ATTEMPTS} failed login attempts. Try again in {settings.ACCOUNT_LOCKOUT_MINUTES} minutes."
                    )
                db.commit()

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive"
            )

        # Reset failed login attempts on successful login
        user.failed_login_attempts = 0
        user.locked_until = None

        # Log successful attempt
        AuthService._log_login_attempt(
            db=db,
            email=credentials.email,
            user_id=user.id,
            success=True,
            ip_address=ip_address,
            user_agent=user_agent
        )

        # Create tokens
        access_token = create_access_token(data={"sub": user.id})
        refresh_token_str = create_refresh_token(data={"sub": user.id})

        # Store refresh token in database
        refresh_token = RefreshToken(
            user_id=user.id,
            token=refresh_token_str,
            expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        )
        db.add(refresh_token)
        db.commit()

        logger.info(f"User logged in: {user.email}")
        return user, access_token, refresh_token_str

    @staticmethod
    def refresh_access_token(db: Session, refresh_token_str: str) -> str:
        """
        Refresh access token using refresh token.

        Args:
            db: Database session
            refresh_token_str: Refresh token string

        Returns:
            New access token

        Raises:
            HTTPException: If refresh token is invalid or expired
        """
        # Decode refresh token
        payload = decode_token(refresh_token_str)
        if not payload or not verify_token_type(payload, "refresh"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Check if token exists and is not revoked
        refresh_token = db.query(RefreshToken).filter(
            RefreshToken.token == refresh_token_str,
            RefreshToken.revoked == False
        ).first()

        if not refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token not found or revoked",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Check if token is expired
        if refresh_token.expires_at < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token expired",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Get user
        try:
            user_id = int(payload.get("sub"))
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token subject",
                headers={"WWW-Authenticate": "Bearer"},
            ) from None
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Create new access token
        access_token = create_access_token(data={"sub": user.id})

        logger.info(f"Access token refreshed for user: {user.email}")
        return access_token

    @staticmethod
    def logout_user(db: Session, refresh_token_str: str) -> None:
        """
        Logout user by revoking refresh token.

        Args:
            db: Database session
            refresh_token_str: Refresh token to revoke
        """
        refresh_token = db.query(RefreshToken).filter(
            RefreshToken.token == refresh_token_str
        ).first()

        if refresh_token:
            refresh_token.revoked = True
            db.commit()
            logger.info(f"User logged out: user_id={refresh_token.user_id}")

    @staticmethod
    def request_password_reset(db: Session, email: str) -> Optional[str]:
        """
        Request password reset for a user.

        Args:
            db: Database session
            email: User email

        Returns:
            Reset token if user exists, None otherwise
        """
        user = db.query(User).filter(User.email == email).first()
        if not user:
            # Don't reveal if email exists
            logger.info(f"Password reset requested for non-existent email: {email}")
            return None

        # Generate reset token
        token, expires_at = create_password_reset_token_with_expiry()
        user.password_reset_token = token
        user.password_reset_token_expires = expires_at
        db.commit()

        logger.info(f"Password reset token generated for: {email}")
        # In production, send email here
        # For dev, log the token
        logger.info(f"Password reset token (DEV ONLY): {token}")

        return token

    @staticmethod
    def reset_password(db: Session, token: str, new_password: str) -> None:
        """
        Reset user password using reset token.

        Args:
            db: Database session
            token: Password reset token
            new_password: New password

        Raises:
            HTTPException: If token is invalid or expired
        """
        user = db.query(User).filter(
            User.password_reset_token == token
        ).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid password reset token"
            )

        # Check if token is expired
        if user.password_reset_token_expires < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password reset token has expired"
            )

        # Verify password strength
        is_valid, error_msg = verify_password_strength(new_password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )

        # Update password
        user.hashed_password = get_password_hash(new_password)
        user.password_reset_token = None
        user.password_reset_token_expires = None
        user.failed_login_attempts = 0
        user.locked_until = None
        db.commit()

        logger.info(f"Password reset successfully for: {user.email}")

    @staticmethod
    def _log_login_attempt(
        db: Session,
        email: str,
        user_id: Optional[int],
        success: bool,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> None:
        """Log a login attempt."""
        attempt = LoginAttempt(
            user_id=user_id,
            email=email,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success
        )
        db.add(attempt)
        db.commit()
