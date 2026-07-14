import os
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo import MongoClient
from pymongo.errors import PyMongoError

# Vercel's Python runtime does not reliably add this file's own directory to
# sys.path, so the bare `import constants` below can't be assumed to resolve
# on its own — add it explicitly.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from constants import DATABASE_ERROR_MSG, DB_NAME, LOGIN_COLLECTION_NAME, NOT_CONFIGURED_MSG, ROLE_LAWYER

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


def get_collection():
    global _client
    if _client is None:
        _client = MongoClient(MONGODB_URI)
    return _client[DB_NAME][LOGIN_COLLECTION_NAME]


async def list_lawyers() -> JSONResponse:
    if not MONGODB_URI:
        return JSONResponse(status_code=500, content={"error": NOT_CONFIGURED_MSG})

    try:
        docs = get_collection().find({"role": ROLE_LAWYER}, {"_id": 0, "fullName": 1, "email": 1})
        lawyers = [{"name": d.get("fullName", ""), "email": d.get("email", "")} for d in docs]
    except PyMongoError:
        return JSONResponse(status_code=500, content={"error": DATABASE_ERROR_MSG})

    return JSONResponse(status_code=200, content={"lawyers": lawyers})


for _path in ("/api/will/lawyers", "/"):
    app.add_api_route(_path, list_lawyers, methods=["GET"])
