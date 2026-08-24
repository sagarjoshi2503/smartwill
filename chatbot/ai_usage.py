"""Logs per-thread Claude API token usage into MongoDB's aiusages
collection — gated behind the "log-ai-usage" flag (see main.py's chat()).

One document per (emailid, threadid) pair. The first /chat turn in a
thread creates the row; every later turn in the same thread accumulates
into it via $inc rather than inserting a new row — a "thread" here is one
open conversation in the chat widget (see web/src/features/chatbot/
ChatWidget.tsx's threadId, reset on Clear Chat or on remount).
"""

from datetime import datetime, timezone

from pymongo.database import Database

from constants import (
    AI_USAGE_COLLECTION_NAME, DEFAULT_MODEL_PRICING_USD_PER_TOKEN, FLD_COST, FLD_CREATED_DATE, FLD_EMAIL,
    FLD_INPUT_TOKENS, FLD_MODEL_NAME, FLD_OUTPUT_TOKENS, FLD_REQUESTS, FLD_ROLE, FLD_THREAD_ID, FLD_UPDATED_DATE,
    MODEL_PRICING_USD_PER_TOKEN,
)


def _cost_usd(model: str, input_tokens: int, output_tokens: int) -> float:
    rates = MODEL_PRICING_USD_PER_TOKEN.get(model, DEFAULT_MODEL_PRICING_USD_PER_TOKEN)
    return round(input_tokens * rates["input"] + output_tokens * rates["output"], 6)


def log_ai_usage(
    db: Database, *, email: str, role: str | None, thread_id: str, model: str,
    input_tokens: int, output_tokens: int, requests: int,
) -> None:
    """Synchronous — the caller (main.py) must run this via
    asyncio.to_thread(), never call it directly from an async def, since
    pymongo is a blocking driver (see core/db.py's own lesson on this
    exact mistake in api/)."""
    now = datetime.now(timezone.utc)
    cost = _cost_usd(model, input_tokens, output_tokens)
    db[AI_USAGE_COLLECTION_NAME].update_one(
        {FLD_EMAIL: email, FLD_THREAD_ID: thread_id},
        {
            "$inc": {
                FLD_INPUT_TOKENS: input_tokens, FLD_OUTPUT_TOKENS: output_tokens,
                FLD_COST: cost, FLD_REQUESTS: requests,
            },
            "$set": {FLD_MODEL_NAME: model, FLD_ROLE: role or "", FLD_UPDATED_DATE: now},
            "$setOnInsert": {FLD_CREATED_DATE: now},
        },
        upsert=True,
    )
