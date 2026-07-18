from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.shared.constants import CORS_ALLOW_HEADERS, CORS_ALLOW_METHODS, CORS_ALLOW_ORIGINS


def add_cors(app: FastAPI) -> None:
    # The frontend can be served from a different origin than this API (e.g.
    # GitHub Pages calling the Vercel-hosted backend). No cookies/session are
    # used anywhere in this app, so a wildcard origin is safe.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ALLOW_ORIGINS,
        allow_methods=CORS_ALLOW_METHODS,
        allow_headers=CORS_ALLOW_HEADERS,
    )
