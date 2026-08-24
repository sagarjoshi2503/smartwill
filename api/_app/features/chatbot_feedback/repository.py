import re

from pymongo.database import Database
from pymongo.errors import PyMongoError

from _app.core.exceptions import AppError
from _app.shared.constants import (
    CHATBOTRESPONSES_COLLECTION_NAME, DATABASE_UNAVAILABLE, FLD_ANSWER, FLD_EMAIL_ID, FLD_QUESTION,
    FLD_RESPONSE_DATETIME, HTTP_SERVER_ERROR,
)

# Written by chatbot/'s POST /chat/feedback (see chatbot/db.py) — this
# service only ever reads the collection, never writes it.


def list_feedback(db: Database, search: str | None = None) -> list[dict]:
    query: dict = {}
    if search:
        pattern = re.compile(re.escape(search), re.IGNORECASE)
        query = {
            "$or": [
                {FLD_EMAIL_ID: pattern},
                {FLD_QUESTION: pattern},
                {FLD_ANSWER: pattern},
            ]
        }
    try:
        return list(db[CHATBOTRESPONSES_COLLECTION_NAME].find(query).sort(FLD_RESPONSE_DATETIME, -1))
    except PyMongoError:
        raise AppError(HTTP_SERVER_ERROR, DATABASE_UNAVAILABLE)
