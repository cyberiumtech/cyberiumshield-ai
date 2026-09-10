import hashlib
import hmac
from urllib.parse import urlencode

import httpx

from app.api.routes import integrations
from app.api.routes.integrations import PusherConnectionRequest, build_pusher_auth_params


def test_pusher_signature_is_valid(monkeypatch):
    monkeypatch.setattr(integrations.time, "time", lambda: 1_700_000_000)
    payload = PusherConnectionRequest(
        app_id="123",
        cluster="mt1",
        app_key="public-key",
        app_secret="private-secret",
    )

    params = build_pusher_auth_params(payload)
    unsigned = {key: value for key, value in params.items() if key != "auth_signature"}
    canonical = urlencode(sorted(unsigned.items()))
    expected = hmac.new(
        b"private-secret",
        f"GET\n/apps/123/channels\n{canonical}".encode(),
        hashlib.sha256,
    ).hexdigest()

    assert params["auth_signature"] == expected


def test_tinyurl_connection_uses_supplied_bearer_key(client, monkeypatch):
    async def fake_request(method, url, *, headers=None, params=None):
        assert method == "GET"
        assert url == "https://api.tinyurl.com/urls"
        assert headers["Authorization"] == "Bearer tiny-secret"
        return httpx.Response(200, json={"data": []})

    monkeypatch.setattr(integrations, "_provider_request", fake_request)
    response = client.post("/api/v1/integrations/tinyurl/test", json={"api_key": "tiny-secret"})

    assert response.status_code == 200
    assert response.json()["ok"] is True
    assert "tiny-secret" not in response.text


def test_pusher_connection_signs_request_without_returning_secret(client, monkeypatch):
    async def fake_request(method, url, *, headers=None, params=None):
        assert method == "GET"
        assert url == "https://api-eu.pusher.com/apps/123/channels"
        assert params["auth_key"] == "public-key"
        assert len(params["auth_signature"]) == 64
        return httpx.Response(200, json={"channels": {}})

    monkeypatch.setattr(integrations, "_provider_request", fake_request)
    response = client.post(
        "/api/v1/integrations/pusher/test",
        json={
            "app_id": "123",
            "cluster": "eu",
            "app_key": "public-key",
            "app_secret": "private-secret",
        },
    )

    assert response.status_code == 200
    assert response.json()["ok"] is True
    assert "private-secret" not in response.text


def test_provider_auth_failure_is_sanitized(client, monkeypatch):
    async def fake_request(method, url, *, headers=None, params=None):
        return httpx.Response(401, json={"errors": ["provider detail"]})

    monkeypatch.setattr(integrations, "_provider_request", fake_request)
    response = client.post("/api/v1/integrations/tinyurl/test", json={"api_key": "bad-secret"})

    assert response.status_code == 502
    assert response.json()["detail"] == "TinyURL rejected the supplied credentials."
    assert "bad-secret" not in response.text
