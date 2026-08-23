import asyncio
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel

from auth import AuthError, verify_token
from constants import DEFAULT_SEARCH_LIMIT, HEADER_AUTHORIZATION, SYNC_INTERVAL_SECONDS
from db import get_db
from faq_indexer import sync_faq_once
from faq_search import faq_search as run_faq_search
from indexer import sync_once
from search import hybrid_search

logger = logging.getLogger("smartwill-rag")

_checkpoint: datetime | None = None


async def _sync_loop() -> None:
    global _checkpoint
    db = get_db()
    while True:
        try:
            count, _checkpoint = await asyncio.to_thread(sync_once, db, _checkpoint)
            if count:
                logger.info("Indexed %d Will(s)", count)
        except Exception:
            # A transient embedding-provider or Mongo hiccup shouldn't kill
            # the whole service — log it and retry on the next tick.
            logger.warning("Background sync failed", exc_info=True)
        await asyncio.sleep(SYNC_INTERVAL_SECONDS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(_sync_loop())
    # FAQ content is a static file bundled with this deploy (see
    # faq_data.py), not something another service can change at runtime —
    # index it once at startup rather than adding it to the polling loop
    # above, which exists specifically to pick up other services' writes.
    try:
        count = await asyncio.to_thread(sync_faq_once, get_db())
        logger.info("Indexed %d FAQ item(s)", count)
    except Exception:
        logger.warning("FAQ indexing failed", exc_info=True)
    yield
    task.cancel()


app = FastAPI(title="smartwill-rag", lifespan=lifespan)


class SearchRequest(BaseModel):
    query: str
    limit: int = DEFAULT_SEARCH_LIMIT


class SearchResult(BaseModel):
    willId: str
    willType: str
    status: str
    snippet: str
    score: float
    testatorEmail: str | None = None


class SearchResponse(BaseModel):
    results: list[SearchResult]


class FaqSearchRequest(BaseModel):
    query: str
    limit: int = DEFAULT_SEARCH_LIMIT


class FaqSearchResult(BaseModel):
    question: str
    answer: str
    sectionTitle: str
    score: float


class FaqSearchResponse(BaseModel):
    results: list[FaqSearchResult]


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


@app.post("/search", response_model=SearchResponse)
def search(body: SearchRequest, request: Request):
    try:
        email, role = verify_token(request.headers.get(HEADER_AUTHORIZATION))
    except AuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    if not body.query.strip():
        return SearchResponse(results=[])

    results = hybrid_search(get_db(), body.query, role, email, body.limit)
    return SearchResponse(results=results)


# Deliberately unauthenticated, unlike /search above — FAQ content is public
# site copy (see faq_data.py's docstring), not scoped to any signed-in
# testator, so there's no token to verify and no ownership to filter by.
@app.post("/faq-search", response_model=FaqSearchResponse)
def faq_search_endpoint(body: FaqSearchRequest):
    if not body.query.strip():
        return FaqSearchResponse(results=[])

    results = run_faq_search(get_db(), body.query, body.limit)
    return FaqSearchResponse(results=results)


if __name__ == "__main__":
    import uvicorn

    from constants import DEFAULT_HOST, DEFAULT_PORT

    uvicorn.run(app, host=os.environ.get("HOST", DEFAULT_HOST), port=int(os.environ.get("PORT", DEFAULT_PORT)))
