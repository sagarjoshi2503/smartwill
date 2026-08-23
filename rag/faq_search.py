"""Hybrid (keyword + semantic) search over rag_faq_chunks — the FAQ
equivalent of search.py's hybrid_search(), minus ownership filtering (FAQ
content is public site copy, not scoped to any one testator). Reuses
search.py's _reciprocal_rank_fusion() rather than re-implementing RRF a
second time in the same service — see that module's docstring for the
Atlas M10+ migration note, which applies here too.
"""

import math

from pymongo.database import Database

from constants import (
    CHUNK_FLD_EMBEDDING, FAQ_CHUNKS_COLLECTION_NAME, FAQ_FLD_ANSWER, FAQ_FLD_CHUNK_ID,
    FAQ_FLD_QUESTION, FAQ_FLD_SECTION_TITLE, MAX_SEARCH_LIMIT,
)
from embeddings import embed_query
from search import _reciprocal_rank_fusion


def _keyword_search(db: Database, query: str, pool_size: int) -> list[str]:
    cursor = (
        db[FAQ_CHUNKS_COLLECTION_NAME]
        .find({"$text": {"$search": query}}, {FAQ_FLD_CHUNK_ID: 1, "score": {"$meta": "textScore"}})
        .sort([("score", {"$meta": "textScore"})])
        .limit(pool_size)
    )
    return [doc[FAQ_FLD_CHUNK_ID] for doc in cursor]


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _vector_search(db: Database, query: str, pool_size: int) -> list[str]:
    query_vec = embed_query(query)
    candidates = list(db[FAQ_CHUNKS_COLLECTION_NAME].find({}, {FAQ_FLD_CHUNK_ID: 1, CHUNK_FLD_EMBEDDING: 1}))
    scored = [
        (doc[FAQ_FLD_CHUNK_ID], _cosine_similarity(query_vec, doc[CHUNK_FLD_EMBEDDING]))
        for doc in candidates
        if doc.get(CHUNK_FLD_EMBEDDING)
    ]
    scored.sort(key=lambda pair: pair[1], reverse=True)
    return [chunk_id for chunk_id, _ in scored[:pool_size]]


def faq_search(db: Database, query: str, limit: int) -> list[dict]:
    limit = max(1, min(limit, MAX_SEARCH_LIMIT))
    pool_size = max(limit * 4, 20)

    keyword_ranked = _keyword_search(db, query, pool_size)
    vector_ranked = _vector_search(db, query, pool_size)
    fused = _reciprocal_rank_fusion([keyword_ranked, vector_ranked])[:limit]
    if not fused:
        return []

    chunks_by_id = {
        doc[FAQ_FLD_CHUNK_ID]: doc
        for doc in db[FAQ_CHUNKS_COLLECTION_NAME].find({FAQ_FLD_CHUNK_ID: {"$in": [cid for cid, _ in fused]}})
    }

    results = []
    for chunk_id, score in fused:
        chunk = chunks_by_id.get(chunk_id)
        if not chunk:
            continue
        results.append({
            FAQ_FLD_QUESTION: chunk.get(FAQ_FLD_QUESTION) or "",
            FAQ_FLD_ANSWER: chunk.get(FAQ_FLD_ANSWER) or "",
            FAQ_FLD_SECTION_TITLE: chunk.get(FAQ_FLD_SECTION_TITLE) or "",
            "score": round(score, 6),
        })
    return results
