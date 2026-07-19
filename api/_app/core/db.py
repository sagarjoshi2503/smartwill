from functools import lru_cache

from fastapi import Depends
from pymongo import MongoClient
from pymongo.database import Database

from _app.core.config import Settings, get_settings
from _app.core.exceptions import AppError
from _app.shared.constants import HTTP_SERVER_ERROR, MONGODB_NOT_CONFIGURED


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
        raise AppError(HTTP_SERVER_ERROR, MONGODB_NOT_CONFIGURED)
    return _get_client(settings.mongodb_uri)[settings.db_name]
