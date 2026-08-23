import mongomock

import faq_indexer
from faq_data import FAQ_SECTIONS


# --- build_faq_chunks ---

def test_build_faq_chunks_flattens_every_section_item():
    chunks = faq_indexer.build_faq_chunks()
    total_items = sum(len(section["items"]) for section in FAQ_SECTIONS)
    assert len(chunks) == total_items


def test_build_faq_chunks_chunk_id_is_stable_and_unique():
    chunks = faq_indexer.build_faq_chunks()
    chunk_ids = [c["chunkId"] for c in chunks]
    assert len(chunk_ids) == len(set(chunk_ids))
    assert chunk_ids[0] == f"{FAQ_SECTIONS[0]['id']}:0"


def test_build_faq_chunks_text_combines_question_and_answer():
    chunks = faq_indexer.build_faq_chunks()
    first = FAQ_SECTIONS[0]["items"][0]
    matching = next(c for c in chunks if c["question"] == first["q"])
    assert first["q"] in matching["text"]
    assert first["a"] in matching["text"]


# --- sync_faq_once ---

def _fake_db():
    return mongomock.MongoClient().db["smartwill-test"]


def test_sync_faq_once_indexes_every_chunk(monkeypatch):
    db = _fake_db()
    monkeypatch.setattr(faq_indexer, "embed_documents", lambda texts: [[0.1, 0.2] for _ in texts])

    count = faq_indexer.sync_faq_once(db)

    total_items = sum(len(section["items"]) for section in FAQ_SECTIONS)
    assert count == total_items
    assert db[faq_indexer.FAQ_CHUNKS_COLLECTION_NAME].count_documents({}) == total_items


def test_sync_faq_once_is_idempotent_on_rerun(monkeypatch):
    db = _fake_db()
    monkeypatch.setattr(faq_indexer, "embed_documents", lambda texts: [[0.1, 0.2] for _ in texts])

    faq_indexer.sync_faq_once(db)
    count_again = faq_indexer.sync_faq_once(db)

    total_items = sum(len(section["items"]) for section in FAQ_SECTIONS)
    assert count_again == total_items
    # Re-running must upsert in place, not duplicate.
    assert db[faq_indexer.FAQ_CHUNKS_COLLECTION_NAME].count_documents({}) == total_items


def test_sync_faq_once_stores_embedding_and_section_title(monkeypatch):
    db = _fake_db()
    monkeypatch.setattr(faq_indexer, "embed_documents", lambda texts: [[0.5, 0.6] for _ in texts])

    faq_indexer.sync_faq_once(db)

    doc = db[faq_indexer.FAQ_CHUNKS_COLLECTION_NAME].find_one({"chunkId": f"{FAQ_SECTIONS[0]['id']}:0"})
    assert doc is not None
    assert doc["embedding"] == [0.5, 0.6]
    assert doc["sectionTitle"] == FAQ_SECTIONS[0]["title"]
