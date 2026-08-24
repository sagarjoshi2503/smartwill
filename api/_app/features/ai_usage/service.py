from datetime import timezone

from pymongo.database import Database

from _app.features.ai_usage import repository
from _app.shared.constants import (
    FLD_AI_USAGE, FLD_COST, FLD_CREATED_DATE, FLD_EMAIL_ID, FLD_INPUT_TOKENS, FLD_MODEL_NAME, FLD_OUTPUT_TOKENS,
    FLD_REQUESTS, FLD_ROLE, FLD_THREAD_ID, FLD_UPDATED_DATE,
)


def _iso(value):
    if value is None or not hasattr(value, "isoformat"):
        return value
    # pymongo returns naive datetimes (no tzinfo) even though every value
    # this service reads was written as datetime.now(timezone.utc) on the
    # writing side (chatbot/ai_usage.py) — attach UTC explicitly before
    # formatting. Without this, the resulting string has no offset, and a
    # frontend `new Date(...)` on it is interpreted as the browser's local
    # time instead of UTC, silently corrupting any timezone conversion
    # (e.g. the admin grid's IST display).
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()


def admin_list(db: Database, search: str | None = None) -> dict:
    documents = repository.list_usage(db, search)
    return {
        FLD_AI_USAGE: [
            {
                FLD_EMAIL_ID: d.get(FLD_EMAIL_ID) or "",
                FLD_THREAD_ID: d.get(FLD_THREAD_ID) or "",
                FLD_ROLE: d.get(FLD_ROLE) or "",
                FLD_MODEL_NAME: d.get(FLD_MODEL_NAME) or "",
                FLD_INPUT_TOKENS: d.get(FLD_INPUT_TOKENS) or 0,
                FLD_OUTPUT_TOKENS: d.get(FLD_OUTPUT_TOKENS) or 0,
                FLD_REQUESTS: d.get(FLD_REQUESTS) or 0,
                FLD_COST: d.get(FLD_COST) or 0,
                FLD_CREATED_DATE: _iso(d.get(FLD_CREATED_DATE)),
                FLD_UPDATED_DATE: _iso(d.get(FLD_UPDATED_DATE)),
            }
            for d in documents
        ]
    }
