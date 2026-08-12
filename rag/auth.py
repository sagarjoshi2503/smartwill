"""Local JWT verification — this service reads MongoDB directly instead of
going through api/'s endpoints, so it must verify the bearer token itself
rather than relying on api/'s auth dependencies. Same algorithm/claims as
api/_app/core/jwt_auth.py (HS256, `sub`/`role` claims), reimplemented here
rather than imported (this repo's services never import from one another).
"""

import os

import jwt

from constants import (
    BEARER_PREFIX, ERR_JWT_SECRET_KEY_REQUIRED, JWT_ALGORITHM, JWT_CLAIM_ROLE, JWT_CLAIM_SUB,
)

if not os.environ.get("JWT_SECRET_KEY"):
    raise RuntimeError(ERR_JWT_SECRET_KEY_REQUIRED)
JWT_SECRET_KEY = os.environ["JWT_SECRET_KEY"]


class AuthError(Exception):
    """Raised when the Authorization header is missing, malformed, or the
    token fails signature/expiry verification."""


def verify_token(auth_header: str | None) -> tuple[str, str]:
    """Returns (email, role) from a valid `Authorization: Bearer <token>`
    header. Raises AuthError otherwise — callers turn that into a 401."""
    if not auth_header or not auth_header.startswith(BEARER_PREFIX):
        raise AuthError("Missing or malformed Authorization header.")

    token = auth_header[len(BEARER_PREFIX):].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError as exc:
        raise AuthError("Invalid or expired token.") from exc

    email = payload.get(JWT_CLAIM_SUB)
    role = payload.get(JWT_CLAIM_ROLE)
    if not email or not role:
        raise AuthError("Token missing required claims.")
    return email, role
