from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from _app.core.config import get_settings
from _app.shared.constants import (
    CORS_ALLOW_HEADERS, CORS_ALLOW_METHODS, HEADER_REFERRER_POLICY, HEADER_X_CONTENT_TYPE_OPTIONS,
    HEADER_X_FRAME_OPTIONS, SECURITY_HEADER_VALUES,
)


def add_cors(app: FastAPI) -> None:
    # Only the React web app (dev + prod) is allowed to call this API.
    settings = get_settings()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_methods=CORS_ALLOW_METHODS,
        allow_headers=CORS_ALLOW_HEADERS,
    )


def add_security_headers(app: FastAPI) -> None:
    """Basic defense-in-depth hardening headers on every response — none of
    these are set by FastAPI/Starlette by default. Not independently
    exploitable on their own (this API serves JSON, not HTML, so there's
    no first-party clickjacking/MIME-sniffing surface here to begin with),
    but cheap to add and expected by any automated security scan."""
    @app.middleware("http")
    async def _security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers[HEADER_X_CONTENT_TYPE_OPTIONS] = SECURITY_HEADER_VALUES[HEADER_X_CONTENT_TYPE_OPTIONS]
        response.headers[HEADER_X_FRAME_OPTIONS] = SECURITY_HEADER_VALUES[HEADER_X_FRAME_OPTIONS]
        response.headers[HEADER_REFERRER_POLICY] = SECURITY_HEADER_VALUES[HEADER_REFERRER_POLICY]
        return response
