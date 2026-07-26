from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, Request

from _app.core.config import Settings, get_settings
from _app.core.exceptions import AppError
from _app.shared.constants import (
    HTTP_SERVER_ERROR, HTTP_UNAUTHORIZED, INVALID_AUTH_TOKEN, JWT_ALGORITHM, JWT_EXPIRE_MINUTES,
    JWT_NOT_CONFIGURED, MISSING_AUTH_TOKEN, ROLE_ADMIN, ROLE_TESTATOR,
)


def create_access_token(email: str, role: str, settings: Settings) -> str:
    if not settings.jwt_secret_key:
        raise AppError(HTTP_SERVER_ERROR, JWT_NOT_CONFIGURED)

    now = datetime.now(timezone.utc)
    payload = {"sub": email, "role": role, "iat": now, "exp": now + timedelta(minutes=JWT_EXPIRE_MINUTES)}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=JWT_ALGORITHM)


def _decode_bearer_token(request: Request, settings: Settings) -> dict:
    auth_header = request.headers.get("Authorization") or ""
    if not auth_header.startswith("Bearer ") or len(auth_header) <= len("Bearer "):
        raise AppError(HTTP_UNAUTHORIZED, MISSING_AUTH_TOKEN)
    if not settings.jwt_secret_key:
        raise AppError(HTTP_SERVER_ERROR, JWT_NOT_CONFIGURED)

    token = auth_header[len("Bearer "):].strip()
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        raise AppError(HTTP_UNAUTHORIZED, INVALID_AUTH_TOKEN)


def get_current_admin(request: Request, settings: Settings = Depends(get_settings)) -> str:
    """FastAPI dependency: returns the authenticated admin's email, or raises 401."""
    payload = _decode_bearer_token(request, settings)
    if payload.get("role") != ROLE_ADMIN or not payload.get("sub"):
        raise AppError(HTTP_UNAUTHORIZED, INVALID_AUTH_TOKEN)
    return payload["sub"]


def get_current_testator(request: Request, settings: Settings = Depends(get_settings)) -> str:
    """FastAPI dependency: returns the authenticated testator's email, or raises 401."""
    payload = _decode_bearer_token(request, settings)
    if payload.get("role") != ROLE_TESTATOR or not payload.get("sub"):
        raise AppError(HTTP_UNAUTHORIZED, INVALID_AUTH_TOKEN)
    return payload["sub"]
