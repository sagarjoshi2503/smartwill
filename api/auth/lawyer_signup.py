import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import bcrypt
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError, PyMongoError

# Vercel's Python runtime does not reliably add this file's own directory to
# sys.path, so the bare `import constants` below can't be assumed to resolve
# on its own — add it explicitly.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from constants import (
    COLLECTION_NAME,
    DATABASE_ERROR_MSG,
    DB_NAME,
    EMAIL_ALREADY_EXISTS_MSG,
    EMAIL_RE,
    FULL_NAME_REQUIRED_MSG,
    INVALID_EMAIL_MSG,
    PASSWORD_TOO_SHORT_MSG,
    ROLE_LAWYER,
    SIGNUP_NOT_CONFIGURED_MSG,
)

MONGODB_URI = os.environ.get("MONGODB_URI")

app = FastAPI()

# Same reasoning as api/auth/verify.py: no cookies/session involved here,
# so a wildcard origin is safe.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

# Reused across warm serverless invocations instead of reconnecting per request.
_client: MongoClient | None = None


def get_collection():
    global _client
    if _client is None:
        _client = MongoClient(MONGODB_URI)
        _client[DB_NAME][COLLECTION_NAME].create_index("email", unique=True)
    return _client[DB_NAME][COLLECTION_NAME]


async def lawyer_signup(request: Request) -> JSONResponse:
    if not MONGODB_URI:
        return JSONResponse(status_code=500, content={"error": SIGNUP_NOT_CONFIGURED_MSG})

    try:
        body = await request.json()
    except Exception:
        body = {}
    if not isinstance(body, dict):
        body = {}

    full_name = (body.get("fullName") or "").strip()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password")

    if not full_name:
        return JSONResponse(status_code=400, content={"error": FULL_NAME_REQUIRED_MSG})
    if not email or not EMAIL_RE.match(email):
        return JSONResponse(status_code=400, content={"error": INVALID_EMAIL_MSG})
    if not isinstance(password, str) or len(password) < 8:
        return JSONResponse(status_code=400, content={"error": PASSWORD_TOO_SHORT_MSG})

    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    try:
        collection = get_collection()
        collection.insert_one({
            "fullName": full_name,
            "email": email,
            "passwordHash": password_hash,
            "role": ROLE_LAWYER,
            "createdAt": datetime.now(timezone.utc),
        })
    except DuplicateKeyError:
        return JSONResponse(status_code=409, content={"error": EMAIL_ALREADY_EXISTS_MSG})
    except PyMongoError:
        return JSONResponse(status_code=500, content={"error": DATABASE_ERROR_MSG})

    return JSONResponse(status_code=201, content={"name": full_name, "email": email})


# Mirrors the defensive multi-path registration in api/auth/verify.py — works
# whether Vercel forwards the rewritten path, the file-based auto-route, or
# neither.
for _path in ("/api/auth/lawyer-signup", "/api/auth/lawyer_signup", "/"):
    app.add_api_route(_path, lawyer_signup, methods=["POST"])
