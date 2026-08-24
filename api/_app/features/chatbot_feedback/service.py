from datetime import timezone

from pymongo.database import Database

from _app.features.chatbot_feedback import repository
from _app.shared.constants import (
    FLD_ANSWER, FLD_EMAIL_ID, FLD_FEEDBACK, FLD_NOT_LIKED_REASON, FLD_QUESTION, FLD_RESPONSE_DATETIME,
)


def _iso(value):
    if value is None or not hasattr(value, "isoformat"):
        return value
    # pymongo returns naive datetimes (no tzinfo) even though every value
    # this service reads was written as datetime.now(timezone.utc) on the
    # writing side (chatbot/main.py) — attach UTC explicitly before
    # formatting, or the resulting string has no offset and a frontend
    # `new Date(...)` on it is interpreted as the browser's local time
    # instead of UTC.
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()


def admin_list(db: Database, search: str | None = None) -> dict:
    documents = repository.list_feedback(db, search)
    return {
        FLD_FEEDBACK: [
            {
                FLD_EMAIL_ID: d.get(FLD_EMAIL_ID) or "",
                FLD_QUESTION: d.get(FLD_QUESTION) or "",
                FLD_ANSWER: d.get(FLD_ANSWER) or "",
                FLD_RESPONSE_DATETIME: _iso(d.get(FLD_RESPONSE_DATETIME)),
                FLD_NOT_LIKED_REASON: d.get(FLD_NOT_LIKED_REASON) or "",
            }
            for d in documents
        ]
    }
