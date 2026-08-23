"""MongoDB client for the chatbotresponses feedback collection — same
lru_cache'd-client pattern as api/_app/core/db.py and rag/db.py, duplicated
locally rather than imported (this repo's services never import from one
another). Only used by /chat/feedback; the rest of this service keeps no
persistent state of its own."""

import os
from functools import lru_cache

from pymongo import MongoClient
from pymongo.database import Database

from constants import DB_NAME, ERR_MONGODB_URI_REQUIRED

if not os.environ.get("MONGODB_URI"):
    raise RuntimeError(ERR_MONGODB_URI_REQUIRED)
MONGODB_URI = os.environ["MONGODB_URI"]


@lru_cache
def _get_client() -> MongoClient:
    return MongoClient(MONGODB_URI)


def get_db() -> Database:
    return _get_client()[os.environ.get("DB_NAME", DB_NAME)]
