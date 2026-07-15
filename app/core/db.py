from functools import lru_cache

from fastapi import Depends
from pymongo import MongoClient
from pymongo.database import Database

from app.core.config import Settings, get_settings
from app.core.exceptions import AppError

DB_NAME = "smartwill"


@lru_cache
def _get_client(mongodb_uri: str) -> MongoClient:
    """Cached across warm serverless invocations instead of reconnecting per request."""
    return MongoClient(mongodb_uri)


def get_db(settings: Settings = Depends(get_settings)) -> Database:
    """FastAPI dependency. Raising here (rather than returning None) means routes
    never see a broken db handle — the "not configured" check happens once, centrally.
    Depends on get_settings (rather than calling it directly) so tests can override
    either dependency independently via app.dependency_overrides."""
    if not settings.mongodb_uri:
        raise AppError(500, "This feature is not configured on the server (missing MONGODB_URI).")
    return _get_client(settings.mongodb_uri)[DB_NAME]
