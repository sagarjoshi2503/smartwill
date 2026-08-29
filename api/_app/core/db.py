import threading
from functools import lru_cache

from fastapi import Depends
from pymongo import MongoClient
from pymongo.database import Database
from pymongo.errors import PyMongoError

from _app.core.config import Settings, get_settings
from _app.core.exceptions import AppError
from _app.core.logging import get_logger
from _app.shared.constants import (
    FLD_TESTATOR_EMAIL, FLD_UPDATED_AT, FLD_WILL_ID, HTTP_SERVER_ERROR, MONGODB_NOT_CONFIGURED,
    WILL_COLLECTION_NAME,
)

logger = get_logger(__name__)


@lru_cache
def _get_client(mongodb_uri: str) -> MongoClient:
    """Cached across warm serverless invocations instead of reconnecting per request."""
    return MongoClient(mongodb_uri)


@lru_cache
def _ensure_indexes(mongodb_uri: str, db_name: str, timeout_ms: int) -> None:
    """Runs at most once per (uri, db_name) per warm process, same caching
    idea as _get_client — even a no-op create_index() call is a network
    round trip to Atlas, so this must not run on every request.

    Without these, find_will_by_id (used by every "view/edit a Will" page,
    both testator and admin) and find_wills_by_testator_email_since (My
    Wills) both fall back to a full collection scan of `will` — there was
    never an index on willId or testatorEmail at all. The earlier fix in
    create_will/repository.py and admin_dashboard/repository.py (a
    projection limiting which fields the list views pull over the wire)
    only cut the per-document payload size; it didn't touch the cost of
    finding the matching document(s) in the first place, so the same
    "slow to load" symptom always comes back once the collection grows
    past whatever size Mongo can still brute-force-scan quickly.

    Uses its own short-timeout client rather than _get_client(mongodb_uri)
    — an unreachable/misconfigured Mongo here must fail fast and get out of
    the way of the actual request (index creation is best-effort; a missing
    index just means the next query is slow, not broken) rather than block
    every request behind PyMongo's default ~30s server-selection timeout.
    """
    try:
        db = MongoClient(mongodb_uri, serverSelectionTimeoutMS=timeout_ms)[db_name]
        db[WILL_COLLECTION_NAME].create_index(FLD_WILL_ID, unique=True)
        db[WILL_COLLECTION_NAME].create_index([(FLD_TESTATOR_EMAIL, 1), (FLD_UPDATED_AT, -1)])
    except PyMongoError:
        logger.warning("Could not ensure `will` collection indexes", exc_info=True)


def get_db(settings: Settings = Depends(get_settings)) -> Database:
    """FastAPI dependency. Raising here (rather than returning None) means routes
    never see a broken db handle — the "not configured" check happens once, centrally.
    Depends on get_settings (rather than calling it directly) so tests can override
    either dependency independently via app.dependency_overrides."""
    if not settings.mongodb_uri:
        raise AppError(HTTP_SERVER_ERROR, MONGODB_NOT_CONFIGURED)
    # Fire-and-forget: _ensure_indexes' own @lru_cache only de-dupes work
    # within one warm process, but on Vercel serverless a process is often
    # cold-started per request rather than staying warm — calling this
    # synchronously here previously meant most requests blocked on a brand
    # new Mongo connection + two create_index() round-trips before the
    # actual query even started, which is exactly backwards for a "make
    # requests faster" fix. Spawning a thread costs microseconds (no I/O),
    # so this never adds latency to the response regardless of whether the
    # process is warm or cold; index creation happens in the background and
    # simply hasn't landed yet for the very first query or two after a cold
    # start, same as before this existed.
    threading.Thread(
        target=_ensure_indexes, args=(settings.mongodb_uri, settings.db_name, settings.index_ensure_timeout_ms),
        daemon=True,
    ).start()
    return _get_client(settings.mongodb_uri)[settings.db_name]
