"""Builds a searchable text blob for one Will and keeps rag_will_chunks in
sync with the `will` collection api/ writes to. Runs as a background loop
(see main.py) — never touches api/'s save path, just reads the same
MongoDB database on a timer.

The text blob is built generically (walk every string value in the Will
dict, skip a small blocklist of non-textual/identifier fields) rather than
hardcoding every field name from web/src/types.ts — the Will schema is
free to keep evolving without this file needing a matching update every
time a new field is added.
"""

from datetime import datetime, timezone

from pymongo.database import Database

from constants import (
    CHUNK_FLD_EMBEDDING, CHUNK_FLD_TEXT, CHUNKS_COLLECTION_NAME, FLD_STATUS, FLD_TESTATOR_EMAIL,
    FLD_UPDATED_AT, FLD_WILL, FLD_WILL_ID, FLD_WILL_TYPE, WILL_COLLECTION_NAME,
)
from embeddings import embed_documents

# Identifier/administrative fields that are either already redacted before
# storage (PAN/Aadhaar — see api/_app/features/create_will/service.py's
# redact_id_numbers()) or just aren't useful/safe to make searchable text
# (emails, raw ID numbers/types, status codes, timestamps).
_EXCLUDE_KEYS = {
    "idType", "idNumber", "jointIdType", "jointIdNumber", "subIdType", "subIdNumber",
    "residualIdType", "residualIdNumber", "pan", "aadhaarNumber", "spouseAadhaarNumber",
    "willId", "testatorEmail", "createdBy", "reviewerEmail", "adminEmail",
    "paymentStatus", "paymentAmount", "status", "willType", "createdAt", "updatedAt",
}


def _collect_strings(value, out: list[str]) -> None:
    if isinstance(value, dict):
        for key, v in value.items():
            if key in _EXCLUDE_KEYS:
                continue
            _collect_strings(v, out)
    elif isinstance(value, list):
        for item in value:
            _collect_strings(item, out)
    elif isinstance(value, str):
        s = value.strip()
        if s:
            out.append(s)


def build_searchable_text(will_data: dict) -> str:
    """`will_data` is the nested `will` dict (not the whole Mongo document)."""
    collected: list[str] = []
    _collect_strings(will_data or {}, collected)
    seen: set[str] = set()
    unique: list[str] = []
    for s in collected:
        if s not in seen:
            seen.add(s)
            unique.append(s)
    return " | ".join(unique)


def _ensure_indexes(db: Database) -> None:
    chunks = db[CHUNKS_COLLECTION_NAME]
    chunks.create_index(FLD_TESTATOR_EMAIL)
    chunks.create_index(FLD_WILL_ID, unique=True)
    # Mongo's plain `text` index type works on every tier, including the
    # free M0 — this is the keyword half of hybrid search until an M10+
    # cluster lets search.py swap this for real Atlas Search (see
    # search.py's module docstring for the migration note).
    chunks.create_index([(CHUNK_FLD_TEXT, "text")], name="text_search")


def sync_once(db: Database, since: datetime | None = None) -> tuple[int, datetime | None]:
    """Re-indexes every Will updated since `since` (or all Wills, on first
    run — pass since=None). Returns (count indexed, new checkpoint to pass
    as `since` on the next call — unchanged if nothing was indexed)."""
    _ensure_indexes(db)

    query = {FLD_UPDATED_AT: {"$gt": since}} if since else {}
    docs = list(db[WILL_COLLECTION_NAME].find(query))
    if not docs:
        return 0, since

    new_checkpoint = max((doc[FLD_UPDATED_AT] for doc in docs if doc.get(FLD_UPDATED_AT)), default=since)

    texts = [build_searchable_text(doc.get(FLD_WILL) or {}) for doc in docs]
    # Wills with no searchable text at all (e.g. an empty in-progress draft)
    # aren't worth embedding — skip them rather than indexing a blank chunk.
    indexable = [(doc, text) for doc, text in zip(docs, texts) if text]
    if not indexable:
        return 0, new_checkpoint

    embeddings = embed_documents([text for _, text in indexable])

    chunks = db[CHUNKS_COLLECTION_NAME]
    now = datetime.now(timezone.utc)
    for (doc, text), embedding in zip(indexable, embeddings):
        chunks.replace_one(
            {FLD_WILL_ID: doc[FLD_WILL_ID]},
            {
                FLD_WILL_ID: doc[FLD_WILL_ID],
                FLD_TESTATOR_EMAIL: doc.get(FLD_TESTATOR_EMAIL) or "",
                FLD_WILL_TYPE: doc.get(FLD_WILL_TYPE) or "",
                FLD_STATUS: doc.get(FLD_STATUS) or "",
                CHUNK_FLD_TEXT: text,
                CHUNK_FLD_EMBEDDING: embedding,
                FLD_UPDATED_AT: now,
            },
            upsert=True,
        )
    return len(indexable), new_checkpoint
