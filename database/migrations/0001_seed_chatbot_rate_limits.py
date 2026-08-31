"""Seeds the `ratelimits` collection's single chatbot rate-limit document,
if it doesn't already exist.

Field names/values must stay in exact sync with:
  - api/_app/shared/constants.py's RATE_LIMITS_*/FLD_MAX_*/FLD_UPDATED_*
    (the Admin Portal's Rate Limits tab reads/writes this same document)
  - chatbot/constants.py's matching FLD_MAX_*/DEFAULT_MAX_* (rate_limit.py
    reads this document to enforce the actual daily caps)

Idempotent by design ($setOnInsert, not $set) — safe to re-run against an
environment where an admin has already customized these values via the
Admin Portal; this must never overwrite that.
"""

COLLECTION_NAME = "ratelimits"
DOC_ID = "chatbot"

DEFAULTS = {
    "maxThreadsPerDay": 100,
    "maxCostUsdPerDay": 5.0,
    "maxTokensPerDay": 50_000,
    "updatedAt": None,
    "updatedBy": None,
}


def up(db) -> None:
    db[COLLECTION_NAME].update_one({"_id": DOC_ID}, {"$setOnInsert": DEFAULTS}, upsert=True)
