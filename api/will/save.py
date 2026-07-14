import os
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo import MongoClient
from pymongo.errors import PyMongoError

from constants import DATABASE_ERROR_MSG, DB_NAME, NOT_CONFIGURED_MSG, WILL_COLLECTION_NAME, WILL_DATA_REQUIRED_MSG

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


def get_collection():
    global _client
    if _client is None:
        _client = MongoClient(MONGODB_URI)
    return _client[DB_NAME][WILL_COLLECTION_NAME]


async def save_will(request: Request) -> JSONResponse:
    if not MONGODB_URI:
        return JSONResponse(status_code=500, content={"error": NOT_CONFIGURED_MSG})

    try:
        body = await request.json()
    except Exception:
        body = None
    if not isinstance(body, dict) or not body:
        return JSONResponse(status_code=400, content={"error": WILL_DATA_REQUIRED_MSG})

    # willId is always generated server-side (never trusted from the client) so
    # every saved will document gets a fresh, unique identifier.
    will_id = str(uuid.uuid4())
    document = {
        **body,
        "willId": will_id,
        "submittedAt": datetime.now(timezone.utc),
    }

    try:
        get_collection().insert_one(document)
    except PyMongoError:
        return JSONResponse(status_code=500, content={"error": DATABASE_ERROR_MSG})

    return JSONResponse(status_code=201, content={"willId": will_id})


for _path in ("/api/will/save", "/"):
    app.add_api_route(_path, save_will, methods=["POST"])
