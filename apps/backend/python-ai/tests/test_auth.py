"""Tests for authentication endpoints."""
import pytest
from fastapi import status
from app.db.models import User, Role
from app.core.security import get_password_hash


@pytest.fixture
def test_user_data():
    """Test user registration data."""
    return {
        "email": "test@example.com",
        "username": "testuser",
        "password": "TestPass123",
        "full_name": "Test User"
    }


@pytest.fixture
def create_test_user(client, db):
    """Create a test user in database."""
    def _create_user(email="user@example.com", username="user", password="Pass123!", roles=None):
        # Create viewer role if it doesn't exist
        viewer_role = db.query(Role).filter(Role.name == "viewer").first()
        if not viewer_role:
            viewer_role = Role(name="viewer", description="Read-only access")
            db.add(viewer_role)
            db.commit()

        user = User(
            email=email,
            username=username,
            hashed_password=get_password_hash(password),
            is_active=True,
            is_verified=True
        )

        if roles:
            for role_name in roles:
                role = db.query(Role).filter(Role.name == role_name).first()
                if not role:
                    role = Role(name=role_name, description=f"{role_name} role")
                    db.add(role)
                    db.flush()
                user.roles.append(role)
        else:
            user.roles.append(viewer_role)

        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    return _create_user


@pytest.mark.unit
def test_register_user_success(client, test_user_data):
    """Test successful user registration."""
    response = client.post("/api/v1/auth/register", json=test_user_data)

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["email"] == test_user_data["email"]
    assert data["username"] == test_user_data["username"]
    assert data["is_active"] is True
    assert "id" in data


@pytest.mark.unit
def test_register_duplicate_email(client, create_test_user, test_user_data):
    """Test registration with duplicate email fails."""
    create_test_user(email=test_user_data["email"], username="different")

    response = client.post("/api/v1/auth/register", json=test_user_data)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Email already registered" in response.json()["detail"]


@pytest.mark.unit
def test_register_duplicate_username(client, create_test_user, test_user_data):
    """Test registration with duplicate username fails."""
    create_test_user(email="other@example.com", username=test_user_data["username"])

    response = client.post("/api/v1/auth/register", json=test_user_data)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Username already taken" in response.json()["detail"]


@pytest.mark.unit
def test_register_weak_password(client, test_user_data):
    """Test registration with weak password fails."""
    test_user_data["password"] = "weak"

    response = client.post("/api/v1/auth/register", json=test_user_data)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Password" in response.json()["detail"]


@pytest.mark.unit
def test_login_success(client, create_test_user):
    """Test successful login."""
    password = "TestPass123"
    user = create_test_user(email="login@example.com", password=password)

    response = client.post("/api/v1/auth/login", json={
        "email": user.email,
        "password": password
    })

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.unit
def test_login_wrong_password(client, create_test_user):
    """Test login with wrong password fails."""
    user = create_test_user(email="wrong@example.com", password="Correct123")

    response = client.post("/api/v1/auth/login", json={
        "email": user.email,
        "password": "WrongPass123"
    })

    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Incorrect email or password" in response.json()["detail"]


@pytest.mark.unit
def test_login_nonexistent_user(client):
    """Test login with non-existent user fails."""
    response = client.post("/api/v1/auth/login", json={
        "email": "nonexistent@example.com",
        "password": "SomePass123"
    })

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.unit
def test_access_protected_endpoint_with_token(client, create_test_user):
    """Test accessing protected endpoint with valid token."""
    password = "TestPass123"
    user = create_test_user(email="protected@example.com", password=password)

    # Login to get token
    login_response = client.post("/api/v1/auth/login", json={
        "email": user.email,
        "password": password
    })
    access_token = login_response.json()["access_token"]

    # Access protected endpoint
    response = client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == user.email
    assert data["username"] == user.username


@pytest.mark.unit
def test_access_protected_endpoint_without_token(client):
    """Test accessing protected endpoint without token fails."""
    response = client.get("/api/v1/users/me")

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.unit
def test_access_protected_endpoint_with_invalid_token(client):
    """Test accessing protected endpoint with invalid token fails."""
    response = client.get(
        "/api/v1/users/me",
        headers={"Authorization": "Bearer invalid_token_12345"}
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.unit
def test_refresh_token_success(client, create_test_user):
    """Test successful token refresh."""
    password = "TestPass123"
    user = create_test_user(email="refresh@example.com", password=password)

    # Login to get refresh token
    login_response = client.post("/api/v1/auth/login", json={
        "email": user.email,
        "password": password
    })
    refresh_token = login_response.json()["refresh_token"]

    # Refresh access token
    response = client.post("/api/v1/auth/refresh", json={
        "refresh_token": refresh_token
    })

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.unit
def test_refresh_token_invalid(client):
    """Test refresh with invalid token fails."""
    response = client.post("/api/v1/auth/refresh", json={
        "refresh_token": "invalid_refresh_token"
    })

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.unit
def test_logout_success(client, create_test_user):
    """Test successful logout."""
    password = "TestPass123"
    user = create_test_user(email="logout@example.com", password=password)

    # Login
    login_response = client.post("/api/v1/auth/login", json={
        "email": user.email,
        "password": password
    })
    refresh_token = login_response.json()["refresh_token"]

    # Logout
    response = client.post("/api/v1/auth/logout", json={
        "refresh_token": refresh_token
    })

    assert response.status_code == status.HTTP_204_NO_CONTENT

    # Try to refresh with revoked token
    refresh_response = client.post("/api/v1/auth/refresh", json={
        "refresh_token": refresh_token
    })
    assert refresh_response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.unit
def test_admin_endpoint_with_admin_role(client, create_test_user):
    """Test admin endpoint access with admin role."""
    password = "AdminPass123"
    admin = create_test_user(
        email="admin@example.com",
        username="admin",
        password=password,
        roles=["admin"]
    )

    # Login
    login_response = client.post("/api/v1/auth/login", json={
        "email": admin.email,
        "password": password
    })
    access_token = login_response.json()["access_token"]

    # Access admin endpoint
    response = client.get(
        "/api/v1/users/admin-only",
        headers={"Authorization": f"Bearer {access_token}"}
    )

    assert response.status_code == status.HTTP_200_OK
    assert "admin access" in response.json()["message"].lower()


@pytest.mark.unit
def test_admin_endpoint_without_admin_role(client, create_test_user):
    """Test admin endpoint access without admin role fails."""
    password = "UserPass123"
    user = create_test_user(
        email="viewer@example.com",
        password=password,
        roles=["viewer"]
    )

    # Login
    login_response = client.post("/api/v1/auth/login", json={
        "email": user.email,
        "password": password
    })
    access_token = login_response.json()["access_token"]

    # Try to access admin endpoint
    response = client.get(
        "/api/v1/users/admin-only",
        headers={"Authorization": f"Bearer {access_token}"}
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "Admin access required" in response.json()["detail"]


@pytest.mark.unit
def test_password_reset_request(client, create_test_user):
    """Test password reset request."""
    user = create_test_user(email="reset@example.com")

    response = client.post("/api/v1/auth/request-password-reset", json={
        "email": user.email
    })

    assert response.status_code == status.HTTP_200_OK
    assert "password reset link" in response.json()["message"].lower()


@pytest.mark.unit
def test_password_reset_request_nonexistent_email(client):
    """Test password reset for non-existent email still returns success."""
    response = client.post("/api/v1/auth/request-password-reset", json={
        "email": "nonexistent@example.com"
    })

    # Should still return 200 to prevent email enumeration
    assert response.status_code == status.HTTP_200_OK
