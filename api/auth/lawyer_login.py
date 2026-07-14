import base64
import binascii
import os
import sys
from pathlib import Path

import bcrypt
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo import MongoClient
from pymongo.errors import PyMongoError

# Vercel's Python runtime does not reliably add this file's own directory to
# sys.path, so the bare `import constants` below can't be assumed to resolve
# on its own — add it explicitly.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from constants import (
    COLLECTION_NAME,
    DATABASE_ERROR_MSG,
    DB_NAME,
    EMAIL_RE,
    INVALID_CREDENTIALS_MSG,
    INVALID_EMAIL_MSG,
    LOGIN_NOT_CONFIGURED_MSG,
    MALFORMED_CREDENTIALS_MSG,
    NOT_LAWYER_MSG,
    PASSWORD_REQUIRED_MSG,
    ROLE_LAWYER,
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
    return _client[DB_NAME][COLLECTION_NAME]


async def lawyer_login(request: Request) -> JSONResponse:
    if not MONGODB_URI:
        return JSONResponse(status_code=500, content={"error": LOGIN_NOT_CONFIGURED_MSG})

    try:
        body = await request.json()
    except Exception:
        body = {}
    if not isinstance(body, dict):
        body = {}

    email = (body.get("email") or "").strip().lower()
    encoded_password = body.get("password")

    if not email or not EMAIL_RE.match(email):
        return JSONResponse(status_code=400, content={"error": INVALID_EMAIL_MSG})
    if not isinstance(encoded_password, str) or not encoded_password:
        return JSONResponse(status_code=400, content={"error": PASSWORD_REQUIRED_MSG})

    try:
        password = base64.b64decode(encoded_password, validate=True).decode("utf-8")
    except (binascii.Error, ValueError, UnicodeDecodeError):
        return JSONResponse(status_code=400, content={"error": MALFORMED_CREDENTIALS_MSG})

    try:
        user = get_collection().find_one({"email": email})
    except PyMongoError:
        return JSONResponse(status_code=500, content={"error": DATABASE_ERROR_MSG})

    if not user or not bcrypt.checkpw(password.encode("utf-8"), user["passwordHash"].encode("utf-8")):
        return JSONResponse(status_code=401, content={"error": INVALID_CREDENTIALS_MSG})

    if user.get("role") != ROLE_LAWYER:
        return JSONResponse(status_code=403, content={"error": NOT_LAWYER_MSG})

    return JSONResponse(status_code=200, content={"name": user["fullName"], "email": user["email"]})


# Mirrors the defensive multi-path registration in api/auth/verify.py — works
# whether Vercel forwards the rewritten path, the file-based auto-route, or
# neither.
for _path in ("/api/auth/lawyer-login", "/api/auth/lawyer_login", "/"):
    app.add_api_route(_path, lawyer_login, methods=["POST"])
