import os
import re
from datetime import datetime, timezone

import bcrypt
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError, PyMongoError

MONGODB_URI = os.environ.get("MONGODB_URI")
DB_NAME = "smartwill"
COLLECTION_NAME = "login"
EMAIL_RE = re.compile(r"^\S+@\S+\.\S+$")

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
        return JSONResponse(
            status_code=500,
            content={"error": "Signup is not configured on the server (missing MONGODB_URI)."},
        )

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
        return JSONResponse(status_code=400, content={"error": "Full name is required."})
    if not email or not EMAIL_RE.match(email):
        return JSONResponse(status_code=400, content={"error": "Enter a valid email address."})
    if not isinstance(password, str) or len(password) < 8:
        return JSONResponse(status_code=400, content={"error": "Password must be at least 8 characters."})

    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    try:
        collection = get_collection()
        collection.insert_one({
            "fullName": full_name,
            "email": email,
            "passwordHash": password_hash,
            "role": "lawyer",
            "createdAt": datetime.now(timezone.utc),
        })
    except DuplicateKeyError:
        return JSONResponse(status_code=409, content={"error": "An account with this email already exists."})
    except PyMongoError:
        return JSONResponse(status_code=500, content={"error": "Could not reach the database. Please try again."})

    return JSONResponse(status_code=201, content={"name": full_name, "email": email})


# Mirrors the defensive multi-path registration in api/auth/verify.py — works
# whether Vercel forwards the rewritten path, the file-based auto-route, or
# neither.
for _path in ("/api/auth/lawyer-signup", "/api/auth/lawyer_signup", "/"):
    app.add_api_route(_path, lawyer_signup, methods=["POST"])
