from datetime import timezone

from pymongo.database import Database

from _app.core.exceptions import AppError
from _app.features.rate_limits import repository
from _app.shared.constants import (
    FLD_MAX_COST_USD_PER_DAY, FLD_MAX_THREADS_PER_DAY, FLD_MAX_TOKENS_PER_DAY, FLD_UPDATED_AT, HTTP_BAD_REQUEST,
    RATE_LIMITS_INVALID_COST, RATE_LIMITS_INVALID_THREADS, RATE_LIMITS_INVALID_TOKENS,
    RATE_LIMITS_MIN_COST_USD_PER_DAY, RATE_LIMITS_MIN_THREADS_PER_DAY, RATE_LIMITS_MIN_TOKENS_PER_DAY,
)


def _iso(value):
    if value is None or not hasattr(value, "isoformat"):
        return value
    # pymongo returns naive datetimes even though this was written as
    # datetime.now(timezone.utc) — attach UTC explicitly before formatting,
    # same reasoning as ai_usage/service.py's own _iso().
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()


def _as_dict(limits: dict) -> dict:
    return {**limits, FLD_UPDATED_AT: _iso(limits.get(FLD_UPDATED_AT))}


def get_limits(db: Database) -> dict:
    return _as_dict(repository.get_limits(db))


def save_limits(db: Database, body: dict, admin_email: str) -> dict:
    max_threads = body.get(FLD_MAX_THREADS_PER_DAY)
    if isinstance(max_threads, bool) or not isinstance(max_threads, int) or max_threads < RATE_LIMITS_MIN_THREADS_PER_DAY:
        raise AppError(HTTP_BAD_REQUEST, RATE_LIMITS_INVALID_THREADS)

    max_cost = body.get(FLD_MAX_COST_USD_PER_DAY)
    if isinstance(max_cost, bool) or not isinstance(max_cost, (int, float)) or max_cost < RATE_LIMITS_MIN_COST_USD_PER_DAY:
        raise AppError(HTTP_BAD_REQUEST, RATE_LIMITS_INVALID_COST)

    max_tokens = body.get(FLD_MAX_TOKENS_PER_DAY)
    if isinstance(max_tokens, bool) or not isinstance(max_tokens, int) or max_tokens < RATE_LIMITS_MIN_TOKENS_PER_DAY:
        raise AppError(HTTP_BAD_REQUEST, RATE_LIMITS_INVALID_TOKENS)

    limits = repository.save_limits(db, max_threads, float(max_cost), max_tokens, admin_email)
    return _as_dict(limits)
