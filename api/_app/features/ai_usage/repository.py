import re

from pymongo.database import Database
from pymongo.errors import PyMongoError

from _app.core.exceptions import AppError
from _app.shared.constants import (
    AI_USAGE_COLLECTION_NAME, DATABASE_UNAVAILABLE, FLD_EMAIL_ID, FLD_MODEL_NAME, FLD_THREAD_ID,
    FLD_UPDATED_DATE, HTTP_SERVER_ERROR,
)

# Written by chatbot/'s POST /chat (see chatbot/ai_usage.py), gated behind
# the "log-ai-usage" flag — this service only ever reads the collection.


def list_usage(db: Database, search: str | None = None) -> list[dict]:
    query: dict = {}
    if search:
        pattern = re.compile(re.escape(search), re.IGNORECASE)
        query = {
            "$or": [
                {FLD_EMAIL_ID: pattern},
                {FLD_THREAD_ID: pattern},
                {FLD_MODEL_NAME: pattern},
            ]
        }
    try:
        return list(db[AI_USAGE_COLLECTION_NAME].find(query).sort(FLD_UPDATED_DATE, -1))
    except PyMongoError:
        raise AppError(HTTP_SERVER_ERROR, DATABASE_UNAVAILABLE)
