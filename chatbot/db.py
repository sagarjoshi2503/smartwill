"""MongoDB client for this service's own collections (chatbotresponses,
aiusages) — same lru_cache'd-client pattern as api/_app/core/db.py and
rag/db.py, duplicated locally rather than imported (this repo's services
never import from one another). The rest of this service keeps no
persistent state of its own."""

import os
import threading
from functools import lru_cache

from pymongo import MongoClient
from pymongo.database import Database
from pymongo.errors import PyMongoError

from constants import (
    AI_USAGE_COLLECTION_NAME, DAILY_USAGE_COLLECTION_NAME, DB_NAME, ERR_MONGODB_URI_REQUIRED, FLD_DATE, FLD_EMAIL,
    FLD_THREAD_ID,
)

if not os.environ.get("MONGODB_URI"):
    raise RuntimeError(ERR_MONGODB_URI_REQUIRED)
MONGODB_URI = os.environ["MONGODB_URI"]


@lru_cache
def _get_client() -> MongoClient:
    return MongoClient(MONGODB_URI)


@lru_cache
def _ensure_indexes(mongodb_uri: str, db_name: str) -> None:
    """Runs at most once per (uri, db_name) per warm process (lru_cache).
    Deliberately never called synchronously from get_db() — see api/'s
    core/db.py, which hit exactly this bug once already: calling index
    creation inline on every request meant a cold serverless process paid
    for a full Mongo round-trip before the request could even start. Here
    it's launched on a background thread from get_db() instead, so it
    never sits on any request's critical path.
    """
    try:
        db = MongoClient(mongodb_uri)[db_name]
        db[AI_USAGE_COLLECTION_NAME].create_index([(FLD_EMAIL, 1), (FLD_THREAD_ID, 1)], unique=True)
        db[DAILY_USAGE_COLLECTION_NAME].create_index([(FLD_EMAIL, 1), (FLD_DATE, 1)], unique=True)
    except PyMongoError:
        pass


def get_db() -> Database:
    threading.Thread(
        target=_ensure_indexes, args=(MONGODB_URI, os.environ.get("DB_NAME", DB_NAME)), daemon=True,
    ).start()
    return _get_client()[os.environ.get("DB_NAME", DB_NAME)]
