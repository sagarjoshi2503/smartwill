"""Thin async client for the smartwill-api FastAPI backend — the MCP-side
equivalent of web/src/utils/apiBase.ts's authFetch()."""

import base64
import os

import httpx

API_BASE_URL = os.environ.get("API_BASE_URL", "http://127.0.0.1:8051").rstrip("/")


class ApiError(Exception):
    """Raised on a non-2xx response. Message is the backend's own
    {"error": "..."} string (every router's ErrorResponse shape) when
    present, so FastMCP surfaces something useful to the calling LLM instead
    of a raw HTTP traceback."""


def encode_password(password: str) -> str:
    """Base64 transport obfuscation — matches web/src/utils/encode.ts's
    encodePassword(), which api/_app/core/security.py's
    decode_transport_password() expects on the wire. Not encryption; relies
    on TLS for actual confidentiality, same as the web client."""
    return base64.b64encode(password.encode()).decode()


async def call(method: str, path: str, *, token: str | None = None, json_body: dict | None = None) -> dict:
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    async with httpx.AsyncClient(base_url=API_BASE_URL, timeout=30.0) as client:
        response = await client.request(method, path, headers=headers, json=json_body)

    if response.status_code >= 400:
        try:
            message = response.json().get("error") or response.text
        except Exception:
            message = response.text
        raise ApiError(f"{method} {path} -> {response.status_code}: {message}")

    if not response.content:
        return {}
    return response.json()
