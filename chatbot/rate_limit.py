"""Per-signed-in-user daily usage caps for the chatbot — threads/day,
cost/day, tokens/day. Backed by two collections:

- `ratelimits` (one singleton document, id RATE_LIMITS_DOC_ID) — the
  admin-configurable thresholds themselves. Written by api/'s
  rate_limits feature (Admin Portal -> web/'s RateLimitsAdminTab.tsx),
  read here via get_limits(). Seeded for a fresh environment by
  database/migrations/0001_seed_chatbot_rate_limits.py.
- `chatbotdailyusage` (one document per (emailid, date)) — how much of
  today's quota a given user has actually used. See check_limit()/
  record_usage() below.

Both are deliberately independent of the "log-ai-usage" flag that gates
ai_usage.py's writes to the aiusages collection — that flag only controls
whether the admin-visible analytics grid gets data; quota *enforcement*
must work whether or not an admin has that display flag on, or turning it
off would silently disable cost protection too. check_limit()/
record_usage() below always run (see main.py's chat()).
"""

import logging
import time
from datetime import datetime, timezone

from pymongo.database import Database

from constants import (
    DAILY_USAGE_COLLECTION_NAME, DEFAULT_MAX_COST_USD_PER_DAY, DEFAULT_MAX_THREADS_PER_DAY,
    DEFAULT_MAX_TOKENS_PER_DAY, FLD_DATE, FLD_EMAIL, FLD_MAX_COST_USD_PER_DAY, FLD_MAX_THREADS_PER_DAY,
    FLD_MAX_TOKENS_PER_DAY, FLD_THREAD_IDS, FLD_TOTAL_COST, FLD_TOTAL_TOKENS, RATE_LIMITS_CACHE_TTL_SECONDS,
    RATE_LIMITS_COLLECTION_NAME, RATE_LIMITS_DOC_ID,
)

logger = logging.getLogger("forwardlegacy-chatbot")

_limits_cache: tuple[dict, float] | None = None


def _today_key() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def get_limits(db: Database) -> dict:
    """Returns {maxThreadsPerDay, maxCostUsdPerDay, maxTokensPerDay},
    cached for RATE_LIMITS_CACHE_TTL_SECONDS so an admin edit doesn't
    require a restart but every /chat request also doesn't pay for a Mongo
    round-trip. Falls back to the in-code defaults (constants.py's
    DEFAULT_MAX_*) if the document is missing entirely — a fresh,
    unmigrated database fails safe-but-usable rather than crashing or
    leaving the assistant unlimited."""
    global _limits_cache
    now = time.monotonic()
    if _limits_cache is not None and now - _limits_cache[1] < RATE_LIMITS_CACHE_TTL_SECONDS:
        return _limits_cache[0]

    result = {
        FLD_MAX_THREADS_PER_DAY: DEFAULT_MAX_THREADS_PER_DAY,
        FLD_MAX_COST_USD_PER_DAY: DEFAULT_MAX_COST_USD_PER_DAY,
        FLD_MAX_TOKENS_PER_DAY: DEFAULT_MAX_TOKENS_PER_DAY,
    }
    try:
        doc = db[RATE_LIMITS_COLLECTION_NAME].find_one({"_id": RATE_LIMITS_DOC_ID})
        if doc:
            for key in result:
                if key in doc:
                    result[key] = doc[key]
    except Exception:
        logger.warning("Could not read rate limit config, using in-code defaults", exc_info=True)

    _limits_cache = (result, now)
    return result


def check_limit(db: Database, email: str, thread_id: str) -> str | None:
    """Returns a short reason the request should be refused, or None if
    it's within all three daily caps. Must be called — and obeyed — BEFORE
    the Claude API call it's meant to gate; checking only after the fact
    would still incur the cost this exists to cap.

    Only the thread-count cap distinguishes a *new* thread from a
    continuing one (starting fewer than the cap's worth of new
    conversations today); the cost and token caps apply to every request
    once tripped, continuing thread or not — the whole point is capping
    total spend, not just conversation count."""
    limits = get_limits(db)
    doc = db[DAILY_USAGE_COLLECTION_NAME].find_one({FLD_EMAIL: email, FLD_DATE: _today_key()})
    if not doc:
        return None

    thread_ids = doc.get(FLD_THREAD_IDS) or []
    max_threads = limits[FLD_MAX_THREADS_PER_DAY]
    max_cost = limits[FLD_MAX_COST_USD_PER_DAY]
    max_tokens = limits[FLD_MAX_TOKENS_PER_DAY]
    if thread_id not in thread_ids and len(thread_ids) >= max_threads:
        return f"daily thread limit reached ({max_threads} threads)"
    if doc.get(FLD_TOTAL_COST, 0) >= max_cost:
        return f"daily cost limit reached (${max_cost})"
    if doc.get(FLD_TOTAL_TOKENS, 0) >= max_tokens:
        return f"daily token limit reached ({max_tokens} tokens)"
    return None


def record_usage(db: Database, email: str, thread_id: str, tokens: int, cost: float) -> None:
    """Synchronous (pymongo) — the caller (main.py) must run this via
    asyncio.to_thread(), same reasoning as ai_usage.py's log_ai_usage()."""
    db[DAILY_USAGE_COLLECTION_NAME].update_one(
        {FLD_EMAIL: email, FLD_DATE: _today_key()},
        {"$addToSet": {FLD_THREAD_IDS: thread_id}, "$inc": {FLD_TOTAL_COST: cost, FLD_TOTAL_TOKENS: tokens}},
        upsert=True,
    )
