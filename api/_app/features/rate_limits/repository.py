from datetime import datetime, timezone

from pymongo.database import Database
from pymongo.errors import PyMongoError

from _app.core.exceptions import AppError
from _app.shared.constants import (
    DATABASE_UNAVAILABLE, FLD_MAX_COST_USD_PER_DAY, FLD_MAX_THREADS_PER_DAY, FLD_MAX_TOKENS_PER_DAY, FLD_UPDATED_AT,
    FLD_UPDATED_BY, HTTP_SERVER_ERROR, RATE_LIMITS_COLLECTION_NAME, RATE_LIMITS_DEFAULT_COST_USD_PER_DAY,
    RATE_LIMITS_DEFAULT_THREADS_PER_DAY, RATE_LIMITS_DEFAULT_TOKENS_PER_DAY, RATE_LIMITS_DOC_ID,
)

# Read by chatbot/'s rate_limit.py via its own independent MONGODB_URI
# (same database, same cross-service-via-shared-Mongo pattern already used
# for aiusages/chatbotresponses — see chatbot/CLAUDE.md) — this service
# owns writes.

_DEFAULTS = {
    FLD_MAX_THREADS_PER_DAY: RATE_LIMITS_DEFAULT_THREADS_PER_DAY,
    FLD_MAX_COST_USD_PER_DAY: RATE_LIMITS_DEFAULT_COST_USD_PER_DAY,
    FLD_MAX_TOKENS_PER_DAY: RATE_LIMITS_DEFAULT_TOKENS_PER_DAY,
}


def get_limits(db: Database) -> dict:
    try:
        doc = db[RATE_LIMITS_COLLECTION_NAME].find_one({"_id": RATE_LIMITS_DOC_ID})
    except PyMongoError:
        raise AppError(HTTP_SERVER_ERROR, DATABASE_UNAVAILABLE)
    if not doc:
        return {**_DEFAULTS, FLD_UPDATED_AT: None, FLD_UPDATED_BY: None}
    return {
        FLD_MAX_THREADS_PER_DAY: doc.get(FLD_MAX_THREADS_PER_DAY, RATE_LIMITS_DEFAULT_THREADS_PER_DAY),
        FLD_MAX_COST_USD_PER_DAY: doc.get(FLD_MAX_COST_USD_PER_DAY, RATE_LIMITS_DEFAULT_COST_USD_PER_DAY),
        FLD_MAX_TOKENS_PER_DAY: doc.get(FLD_MAX_TOKENS_PER_DAY, RATE_LIMITS_DEFAULT_TOKENS_PER_DAY),
        FLD_UPDATED_AT: doc.get(FLD_UPDATED_AT),
        FLD_UPDATED_BY: doc.get(FLD_UPDATED_BY),
    }


def save_limits(db: Database, max_threads: int, max_cost: float, max_tokens: int, admin_email: str) -> dict:
    now = datetime.now(timezone.utc)
    try:
        db[RATE_LIMITS_COLLECTION_NAME].update_one(
            {"_id": RATE_LIMITS_DOC_ID},
            {
                "$set": {
                    FLD_MAX_THREADS_PER_DAY: max_threads,
                    FLD_MAX_COST_USD_PER_DAY: max_cost,
                    FLD_MAX_TOKENS_PER_DAY: max_tokens,
                    FLD_UPDATED_AT: now,
                    FLD_UPDATED_BY: admin_email,
                },
            },
            upsert=True,
        )
    except PyMongoError:
        raise AppError(HTTP_SERVER_ERROR, DATABASE_UNAVAILABLE)
    return get_limits(db)
