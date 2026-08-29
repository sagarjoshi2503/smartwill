from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, Request

from _app.core.config import Settings, get_settings
from _app.core.exceptions import AppError
from _app.shared.constants import (
    BEARER_PREFIX, HEADER_AUTHORIZATION, HTTP_SERVER_ERROR, HTTP_UNAUTHORIZED, INVALID_AUTH_TOKEN,
    JWT_ALGORITHM, JWT_CLAIM_ROLE, JWT_CLAIM_SUB, JWT_NOT_CONFIGURED, MISSING_AUTH_TOKEN,
    ROLE_ADMIN, ROLE_TESTATOR,
)


def create_access_token(email: str, role: str, settings: Settings) -> str:
    if not settings.jwt_secret_key:
        raise AppError(HTTP_SERVER_ERROR, JWT_NOT_CONFIGURED)

    now = datetime.now(timezone.utc)
    payload = {
        JWT_CLAIM_SUB: email, JWT_CLAIM_ROLE: role, "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=JWT_ALGORITHM)


def _decode_bearer_token(request: Request, settings: Settings, verify_exp: bool = True) -> dict:
    auth_header = request.headers.get(HEADER_AUTHORIZATION) or ""
    if not auth_header.startswith(BEARER_PREFIX) or len(auth_header) <= len(BEARER_PREFIX):
        raise AppError(HTTP_UNAUTHORIZED, MISSING_AUTH_TOKEN)
    if not settings.jwt_secret_key:
        raise AppError(HTTP_SERVER_ERROR, JWT_NOT_CONFIGURED)

    token = auth_header[len(BEARER_PREFIX):].strip()
    try:
        return jwt.decode(
            token, settings.jwt_secret_key, algorithms=[JWT_ALGORITHM],
            options={"verify_exp": verify_exp},
        )
    except jwt.PyJWTError:
        raise AppError(HTTP_UNAUTHORIZED, INVALID_AUTH_TOKEN)


def get_current_admin(request: Request, settings: Settings = Depends(get_settings)) -> str:
    """FastAPI dependency: returns the authenticated admin's email, or raises 401."""
    payload = _decode_bearer_token(request, settings)
    if payload.get(JWT_CLAIM_ROLE) != ROLE_ADMIN or not payload.get(JWT_CLAIM_SUB):
        raise AppError(HTTP_UNAUTHORIZED, INVALID_AUTH_TOKEN)
    return payload[JWT_CLAIM_SUB]


def get_current_testator(request: Request, settings: Settings = Depends(get_settings)) -> str:
    """FastAPI dependency: returns the authenticated testator's email, or raises 401."""
    payload = _decode_bearer_token(request, settings)
    if payload.get(JWT_CLAIM_ROLE) != ROLE_TESTATOR or not payload.get(JWT_CLAIM_SUB):
        raise AppError(HTTP_UNAUTHORIZED, INVALID_AUTH_TOKEN)
    return payload[JWT_CLAIM_SUB]


def get_current_testator_allow_expired(request: Request, settings: Settings = Depends(get_settings)) -> str:
    """Same as get_current_testator, but doesn't reject an expired token —
    the signature is still checked, so this can't be forged, only replayed
    after it would otherwise have stopped working. Used solely by the
    logout endpoint (features/client_login/router.py): the frontend fires
    it both on an explicit "Log out" click (token still valid) and when it
    locally detects an already-expired token on page load (see
    web/src/App.tsx's session-restore effect) so clientlogin's status
    reflects an auto-expired session too, not just an explicit one."""
    payload = _decode_bearer_token(request, settings, verify_exp=False)
    if payload.get(JWT_CLAIM_ROLE) != ROLE_TESTATOR or not payload.get(JWT_CLAIM_SUB):
        raise AppError(HTTP_UNAUTHORIZED, INVALID_AUTH_TOKEN)
    return payload[JWT_CLAIM_SUB]
