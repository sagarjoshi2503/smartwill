from pymongo.database import Database

from _app.features.chatbot_feedback import repository
from _app.shared.constants import (
    FLD_ANSWER, FLD_EMAIL_ID, FLD_FEEDBACK, FLD_NOT_LIKED_REASON, FLD_QUESTION, FLD_RESPONSE_DATETIME,
)


def admin_list(db: Database, search: str | None = None) -> dict:
    documents = repository.list_feedback(db, search)
    return {
        FLD_FEEDBACK: [
            {
                FLD_EMAIL_ID: d.get(FLD_EMAIL_ID) or "",
                FLD_QUESTION: d.get(FLD_QUESTION) or "",
                FLD_ANSWER: d.get(FLD_ANSWER) or "",
                FLD_RESPONSE_DATETIME: (
                    d[FLD_RESPONSE_DATETIME].isoformat()
                    if d.get(FLD_RESPONSE_DATETIME) and hasattr(d[FLD_RESPONSE_DATETIME], "isoformat")
                    else d.get(FLD_RESPONSE_DATETIME)
                ),
                FLD_NOT_LIKED_REASON: d.get(FLD_NOT_LIKED_REASON) or "",
            }
            for d in documents
        ]
    }
