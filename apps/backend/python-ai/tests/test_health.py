import pytest
from fastapi import status


@pytest.mark.unit
def test_health_check(client):
    """Test health check endpoint returns 200 and correct payload."""
    response = client.get("/health")

    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert data["status"] == "healthy"
    assert "service" in data
    assert "environment" in data


@pytest.mark.unit
def test_health_check_structure(client):
    """Test health check response has required fields."""
    response = client.get("/health")
    data = response.json()

    required_fields = ["status", "service", "environment"]
    for field in required_fields:
        assert field in data, f"Missing required field: {field}"
