"""Hybrid (keyword + semantic) search over rag_will_chunks.

This is the one module that gets replaced once the Mongo Atlas cluster is
upgraded to M10+: swap `_keyword_search`'s plain `$text` query for an Atlas
`$search` stage, swap `_vector_search`'s brute-force Python cosine scan for
an Atlas `$vectorSearch` stage (after creating a vector index on
CHUNK_FLD_EMBEDDING), and `_reciprocal_rank_fusion` can be dropped entirely
in favor of a single `$rankFusion` aggregation pipeline — it implements the
same algorithm, so results shouldn't meaningfully change. Everything else
in this service (indexer.py, main.py, auth.py) is unaffected by that swap.
"""

import math

from pymongo.database import Database

from constants import (
    CHUNK_FLD_EMBEDDING, CHUNK_FLD_TEXT, CHUNKS_COLLECTION_NAME, FLD_STATUS, FLD_TESTATOR_EMAIL,
    FLD_WILL_ID, FLD_WILL_TYPE, MAX_SEARCH_LIMIT, MIN_SEARCH_POOL_SIZE, ROLE_ADMIN, RRF_K,
    SEARCH_POOL_MULTIPLIER,
)
from embeddings import embed_query

_SNIPPET_LEN = 240


def _ownership_filter(role: str, email: str) -> dict:
    return {} if role == ROLE_ADMIN else {FLD_TESTATOR_EMAIL: email}


def _keyword_search(db: Database, query: str, role: str, email: str, pool_size: int) -> list[str]:
    """Returns willIds ranked by Mongo's plain-text relevance score,
    highest first. Works on every Atlas tier including M0."""
    cursor = (
        db[CHUNKS_COLLECTION_NAME]
        .find(
            {"$text": {"$search": query}, **_ownership_filter(role, email)},
            {FLD_WILL_ID: 1, "score": {"$meta": "textScore"}},
        )
        .sort([("score", {"$meta": "textScore"})])
        .limit(pool_size)
    )
    return [doc[FLD_WILL_ID] for doc in cursor]


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _vector_search(db: Database, query: str, role: str, email: str, pool_size: int) -> list[str]:
    """Returns willIds ranked by semantic similarity to `query`, highest
    first — brute-force cosine scan over every candidate chunk's stored
    embedding (fine at this data scale; an M10+ cluster replaces this with
    a native $vectorSearch stage, see this module's docstring)."""
    query_vec = embed_query(query)
    candidates = list(
        db[CHUNKS_COLLECTION_NAME].find(
            _ownership_filter(role, email),
            {FLD_WILL_ID: 1, CHUNK_FLD_EMBEDDING: 1},
        )
    )
    scored = [
        (doc[FLD_WILL_ID], _cosine_similarity(query_vec, doc[CHUNK_FLD_EMBEDDING]))
        for doc in candidates
        if doc.get(CHUNK_FLD_EMBEDDING)
    ]
    scored.sort(key=lambda pair: pair[1], reverse=True)
    return [will_id for will_id, _ in scored[:pool_size]]


def _reciprocal_rank_fusion(ranked_lists: list[list[str]], k: int = RRF_K) -> list[tuple[str, float]]:
    """Combines multiple ranked (best-first) lists of ids into one fused
    ranking, without needing the two lists' raw scores to be on comparable
    scales (text relevance and cosine similarity aren't). Standard RRF:
    score(id) = sum over lists containing id of 1 / (k + rank_in_that_list),
    rank starting at 1. Same algorithm MongoDB's own $rankFusion uses."""
    scores: dict[str, float] = {}
    for ranked in ranked_lists:
        for rank, item_id in enumerate(ranked, start=1):
            scores[item_id] = scores.get(item_id, 0.0) + 1.0 / (k + rank)
    return sorted(scores.items(), key=lambda pair: pair[1], reverse=True)


def hybrid_search(db: Database, query: str, role: str, email: str, limit: int) -> list[dict]:
    limit = max(1, min(limit, MAX_SEARCH_LIMIT))
    pool_size = max(limit * SEARCH_POOL_MULTIPLIER, MIN_SEARCH_POOL_SIZE)

    keyword_ranked = _keyword_search(db, query, role, email, pool_size)
    vector_ranked = _vector_search(db, query, role, email, pool_size)
    fused = _reciprocal_rank_fusion([keyword_ranked, vector_ranked])[:limit]
    if not fused:
        return []

    chunks_by_id = {
        doc[FLD_WILL_ID]: doc
        for doc in db[CHUNKS_COLLECTION_NAME].find({FLD_WILL_ID: {"$in": [will_id for will_id, _ in fused]}})
    }

    results = []
    for will_id, score in fused:
        chunk = chunks_by_id.get(will_id)
        if not chunk:
            continue
        text = chunk.get(CHUNK_FLD_TEXT) or ""
        result = {
            FLD_WILL_ID: will_id,
            FLD_WILL_TYPE: chunk.get(FLD_WILL_TYPE) or "",
            FLD_STATUS: chunk.get(FLD_STATUS) or "",
            "snippet": text[:_SNIPPET_LEN] + ("…" if len(text) > _SNIPPET_LEN else ""),
            "score": round(score, 6),
        }
        if role == ROLE_ADMIN:
            result[FLD_TESTATOR_EMAIL] = chunk.get(FLD_TESTATOR_EMAIL) or ""
        results.append(result)
    return results
