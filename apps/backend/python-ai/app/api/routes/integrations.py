"""Server-side connection checks for third-party integrations.

Credentials are accepted only for the duration of each request. They are not
persisted or included in logs/responses.
"""

from __future__ import annotations

import hashlib
import hmac
import time
from typing import Any
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address


router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


class TinyUrlConnectionRequest(BaseModel):
    api_key: str = Field(min_length=1, max_length=512)


class PusherConnectionRequest(BaseModel):
    app_id: str = Field(min_length=1, max_length=128)
    cluster: str = Field(pattern=r"^[a-zA-Z0-9-]+$", max_length=32)
    app_key: str = Field(min_length=1, max_length=256)
    app_secret: str = Field(min_length=1, max_length=512)


class IntegrationConnectionResponse(BaseModel):
    ok: bool
    provider: str
    message: str


async def _provider_request(
    method: str,
    url: str,
    *,
    headers: dict[str, str] | None = None,
    params: dict[str, str] | None = None,
) -> httpx.Response:
    timeout = httpx.Timeout(10.0, connect=5.0)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
        return await client.request(method, url, headers=headers, params=params)


def _provider_error(provider: str, response: httpx.Response) -> HTTPException:
    if response.status_code in {401, 403}:
        message = f"{provider} rejected the supplied credentials."
    elif response.status_code == 429:
        message = f"{provider} rate limit reached. Try again later."
    else:
        message = f"{provider} returned HTTP {response.status_code}."
    return HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=message)


@router.post("/tinyurl/test", response_model=IntegrationConnectionResponse)
@limiter.limit("5/minute")
async def test_tinyurl_connection(
    request: Request,
    payload: TinyUrlConnectionRequest,
) -> IntegrationConnectionResponse:
    try:
        response = await _provider_request(
            "GET",
            "https://api.tinyurl.com/urls",
            headers={
                "Authorization": f"Bearer {payload.api_key.strip()}",
                "Accept": "application/json",
            },
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="TinyURL could not be reached from the server.",
        ) from exc

    if not response.is_success:
        raise _provider_error("TinyURL", response)

    return IntegrationConnectionResponse(
        ok=True,
        provider="tinyurl",
        message="TinyURL connection verified successfully.",
    )


def build_pusher_auth_params(payload: PusherConnectionRequest) -> dict[str, str]:
    path = f"/apps/{payload.app_id.strip()}/channels"
    params = {
        "auth_key": payload.app_key.strip(),
        "auth_timestamp": str(int(time.time())),
        "auth_version": "1.0",
    }
    canonical_query = urlencode(sorted(params.items()))
    string_to_sign = f"GET\n{path}\n{canonical_query}"
    params["auth_signature"] = hmac.new(
        payload.app_secret.strip().encode("utf-8"),
        string_to_sign.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return params


@router.post("/pusher/test", response_model=IntegrationConnectionResponse)
@limiter.limit("5/minute")
async def test_pusher_connection(
    request: Request,
    payload: PusherConnectionRequest,
) -> IntegrationConnectionResponse:
    app_id = payload.app_id.strip()
    cluster = payload.cluster.strip().lower()
    url = f"https://api-{cluster}.pusher.com/apps/{app_id}/channels"

    try:
        response = await _provider_request(
            "GET",
            url,
            params=build_pusher_auth_params(payload),
            headers={"Accept": "application/json"},
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Pusher could not be reached from the server.",
        ) from exc

    if not response.is_success:
        raise _provider_error("Pusher", response)

    return IntegrationConnectionResponse(
        ok=True,
        provider="pusher",
        message="Pusher connection verified successfully.",
    )
