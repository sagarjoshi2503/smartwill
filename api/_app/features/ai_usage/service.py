from pymongo.database import Database

from _app.features.ai_usage import repository
from _app.shared.constants import (
    FLD_AI_USAGE, FLD_COST, FLD_CREATED_DATE, FLD_EMAIL_ID, FLD_INPUT_TOKENS, FLD_MODEL_NAME, FLD_OUTPUT_TOKENS,
    FLD_REQUESTS, FLD_ROLE, FLD_THREAD_ID, FLD_UPDATED_DATE,
)


def _iso(value):
    return value.isoformat() if value is not None and hasattr(value, "isoformat") else value


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
