import os
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo import MongoClient
from pymongo.errors import PyMongoError

from constants import (
    DATABASE_ERROR_MSG,
    DB_NAME,
    EMAIL_RE,
    INVALID_LAWYER_EMAIL_MSG,
    LAWYER_NOT_FOUND_MSG,
    LAWYERWILL_COLLECTION_NAME,
    LOGIN_COLLECTION_NAME,
    NOT_CONFIGURED_MSG,
    ROLE_LAWYER,
    WILL_ID_REQUIRED_MSG,
)

MONGODB_URI = os.environ.get("MONGODB_URI")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

# Reused across warm serverless invocations instead of reconnecting per request.
_client: MongoClient | None = None


def get_db():
    global _client
    if _client is None:
        _client = MongoClient(MONGODB_URI)
    return _client[DB_NAME]


async def assign_lawyer(request: Request) -> JSONResponse:
    if not MONGODB_URI:
        return JSONResponse(status_code=500, content={"error": NOT_CONFIGURED_MSG})

    try:
        body = await request.json()
    except Exception:
        body = {}
    if not isinstance(body, dict):
        body = {}

    will_id = (body.get("willId") or "").strip()
    lawyer_email = (body.get("lawyerEmail") or "").strip().lower()

    if not will_id:
        return JSONResponse(status_code=400, content={"error": WILL_ID_REQUIRED_MSG})
    if not lawyer_email or not EMAIL_RE.match(lawyer_email):
        return JSONResponse(status_code=400, content={"error": INVALID_LAWYER_EMAIL_MSG})

    try:
        db = get_db()
        lawyer = db[LOGIN_COLLECTION_NAME].find_one({"email": lawyer_email, "role": ROLE_LAWYER})
        if not lawyer:
            return JSONResponse(status_code=404, content={"error": LAWYER_NOT_FOUND_MSG})

        db[LAWYERWILL_COLLECTION_NAME].insert_one({
            "willId": will_id,
            "lawyerEmail": lawyer_email,
            "assignedAt": datetime.now(timezone.utc),
        })
    except PyMongoError:
        return JSONResponse(status_code=500, content={"error": DATABASE_ERROR_MSG})

    return JSONResponse(status_code=201, content={"willId": will_id, "lawyerEmail": lawyer_email})


for _path in ("/api/will/assign-lawyer", "/api/will/assign_lawyer", "/"):
    app.add_api_route(_path, assign_lawyer, methods=["POST"])
