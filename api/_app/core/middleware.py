from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from _app.core.config import get_settings
from _app.shared.constants import CORS_ALLOW_HEADERS, CORS_ALLOW_METHODS


def add_cors(app: FastAPI) -> None:
    # Only the React web app (dev + prod) is allowed to call this API.
    settings = get_settings()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_methods=CORS_ALLOW_METHODS,
        allow_headers=CORS_ALLOW_HEADERS,
    )
