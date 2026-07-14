import os
import sys
from pathlib import Path

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
    DATABASE_ERROR_MSG,
    DB_NAME,
    EMAIL_RE,
    INVALID_LAWYER_EMAIL_MSG,
    LAWYERWILL_COLLECTION_NAME,
    NOT_CONFIGURED_MSG,
    WILL_COLLECTION_NAME,
)

MONGODB_URI = os.environ.get("MONGODB_URI")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["Content-Type"],
)

# Reused across warm serverless invocations instead of reconnecting per request.
_client: MongoClient | None = None


def get_db():
    global _client
    if _client is None:
        _client = MongoClient(MONGODB_URI)
    return _client[DB_NAME]


async def list_lawyer_wills(request: Request) -> JSONResponse:
    if not MONGODB_URI:
        return JSONResponse(status_code=500, content={"error": NOT_CONFIGURED_MSG})

    email = (request.query_params.get("email") or "").strip().lower()
    if not email or not EMAIL_RE.match(email):
        return JSONResponse(status_code=400, content={"error": INVALID_LAWYER_EMAIL_MSG})

    try:
        db = get_db()
        will_ids = [d["willId"] for d in db[LAWYERWILL_COLLECTION_NAME].find({"lawyerEmail": email}, {"willId": 1})]

        clients = []
        if will_ids:
            for w in db[WILL_COLLECTION_NAME].find({"willId": {"$in": will_ids}}):
                testator = (w.get("will") or {}).get("testator") or {}
                submitted_at = w.get("submittedAt")
                clients.append({
                    "willId": w.get("willId"),
                    "name": testator.get("fullName") or "",
                    "contact": w.get("testatorEmail") or "",
                    "updatedAt": submitted_at.isoformat() if submitted_at else None,
                })
    except PyMongoError:
        return JSONResponse(status_code=500, content={"error": DATABASE_ERROR_MSG})

    clients.sort(key=lambda c: c["updatedAt"] or "", reverse=True)
    return JSONResponse(status_code=200, content={"clients": clients})


for _path in ("/api/will/lawyer-wills", "/api/will/lawyer_wills", "/"):
    app.add_api_route(_path, list_lawyer_wills, methods=["GET"])
