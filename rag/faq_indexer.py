"""Indexes faq_data.py's FAQ_SECTIONS into rag_faq_chunks — one chunk per
Q&A pair (a section is too coarse a retrieval unit; a single FAQ item is
exactly the granularity a chatbot answer should quote from).

Unlike indexer.py's sync_once() (which polls the `will` collection on a
timer for changes other services made), this source is a static Python
file bundled with this service's own deploy — there's nothing to poll, so
sync_faq_once() just re-embeds and upserts every item, keyed by a stable
chunkId, once at startup (see main.py's lifespan). Re-running it is always
safe: replace_one(upsert=True) makes it idempotent.
"""

from datetime import datetime, timezone

from pymongo.database import Database

from constants import (
    CHUNK_FLD_EMBEDDING, CHUNK_FLD_TEXT, FAQ_CHUNKS_COLLECTION_NAME, FAQ_FLD_ANSWER, FAQ_FLD_CHUNK_ID,
    FAQ_FLD_QUESTION, FAQ_FLD_SECTION_ID, FAQ_FLD_SECTION_TITLE, FLD_UPDATED_AT,
)
from embeddings import embed_documents
from faq_data import FAQ_SECTIONS


def build_faq_chunks() -> list[dict]:
    """Flattens FAQ_SECTIONS into one dict per Q&A pair, each with a stable
    chunkId ("<sectionId>:<index>") and the searchable text (question +
    answer, embeddings work better over both than the question alone)."""
    chunks = []
    for section in FAQ_SECTIONS:
        for i, item in enumerate(section["items"]):
            question = item["q"].strip()
            answer = item["a"].strip()
            chunks.append({
                FAQ_FLD_CHUNK_ID: f"{section['id']}:{i}",
                FAQ_FLD_SECTION_ID: section["id"],
                FAQ_FLD_SECTION_TITLE: section["title"],
                FAQ_FLD_QUESTION: question,
                FAQ_FLD_ANSWER: answer,
                CHUNK_FLD_TEXT: f"{question} {answer}",
            })
    return chunks


def _ensure_indexes(db: Database) -> None:
    faq_chunks = db[FAQ_CHUNKS_COLLECTION_NAME]
    faq_chunks.create_index(FAQ_FLD_CHUNK_ID, unique=True)
    faq_chunks.create_index([(CHUNK_FLD_TEXT, "text")], name="text_search")


def sync_faq_once(db: Database) -> int:
    """Re-embeds and upserts every FAQ chunk. Returns the count indexed."""
    _ensure_indexes(db)

    chunks = build_faq_chunks()
    if not chunks:
        return 0

    embeddings = embed_documents([c[CHUNK_FLD_TEXT] for c in chunks])

    faq_chunks = db[FAQ_CHUNKS_COLLECTION_NAME]
    now = datetime.now(timezone.utc)
    for chunk, embedding in zip(chunks, embeddings):
        faq_chunks.replace_one(
            {FAQ_FLD_CHUNK_ID: chunk[FAQ_FLD_CHUNK_ID]},
            {**chunk, CHUNK_FLD_EMBEDDING: embedding, FLD_UPDATED_AT: now},
            upsert=True,
        )
    return len(chunks)
