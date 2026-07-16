from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


def add_cors(app: FastAPI) -> None:
    # The frontend can be served from a different origin than this API (e.g.
    # GitHub Pages calling the Vercel-hosted backend). No cookies/session are
    # used anywhere in this app, so a wildcard origin is safe.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type"],
    )
