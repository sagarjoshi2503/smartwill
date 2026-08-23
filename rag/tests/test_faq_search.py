import mongomock

import faq_search
from constants import FAQ_CHUNKS_COLLECTION_NAME


# --- _cosine_similarity ---

def test_cosine_similarity_identical_vectors_is_one():
    assert faq_search._cosine_similarity([1, 2, 3], [1, 2, 3]) == 1.0


def test_cosine_similarity_orthogonal_vectors_is_zero():
    assert faq_search._cosine_similarity([1, 0], [0, 1]) == 0.0


def test_cosine_similarity_zero_vector_is_zero_not_a_crash():
    assert faq_search._cosine_similarity([0, 0], [1, 2]) == 0.0


# --- _vector_search (mongomock; embed_query monkeypatched) ---

def _fake_db_with_chunks():
    db = mongomock.MongoClient().db["smartwill-test"]
    db[FAQ_CHUNKS_COLLECTION_NAME].insert_many([
        {"chunkId": "wills:0", "embedding": [1.0, 0.0]},
        {"chunkId": "goa:0", "embedding": [0.0, 1.0]},
    ])
    return db


def test_vector_search_ranks_closest_embedding_first(monkeypatch):
    db = _fake_db_with_chunks()
    monkeypatch.setattr(faq_search, "embed_query", lambda q: [1.0, 0.0])

    result = faq_search._vector_search(db, "anything", pool_size=10)

    assert result[0] == "wills:0"


def test_vector_search_returns_no_ownership_scoping(monkeypatch):
    # Unlike search.py's _vector_search, faq_search has no role/email params —
    # FAQ content is public and unscoped.
    db = _fake_db_with_chunks()
    monkeypatch.setattr(faq_search, "embed_query", lambda q: [1.0, 0.0])

    result = faq_search._vector_search(db, "anything", pool_size=10)

    assert set(result) == {"wills:0", "goa:0"}


# --- faq_search (keyword/vector search stubbed out — exercised separately) ---

def test_faq_search_includes_question_answer_and_section_title(monkeypatch):
    db = mongomock.MongoClient().db["smartwill-test"]
    db[FAQ_CHUNKS_COLLECTION_NAME].insert_one({
        "chunkId": "wills:0", "sectionId": "wills", "sectionTitle": "Wills",
        "question": "What is a will?", "answer": "A legal document.", "embedding": [1.0],
    })
    monkeypatch.setattr(faq_search, "_keyword_search", lambda *a, **k: ["wills:0"])
    monkeypatch.setattr(faq_search, "_vector_search", lambda *a, **k: ["wills:0"])

    results = faq_search.faq_search(db, "q", limit=5)

    assert results[0]["question"] == "What is a will?"
    assert results[0]["answer"] == "A legal document."
    assert results[0]["sectionTitle"] == "Wills"


def test_faq_search_returns_empty_list_when_nothing_matches(monkeypatch):
    db = mongomock.MongoClient().db["smartwill-test"]
    monkeypatch.setattr(faq_search, "_keyword_search", lambda *a, **k: [])
    monkeypatch.setattr(faq_search, "_vector_search", lambda *a, **k: [])

    assert faq_search.faq_search(db, "q", limit=5) == []


def test_faq_search_respects_limit(monkeypatch):
    db = mongomock.MongoClient().db["smartwill-test"]
    db[FAQ_CHUNKS_COLLECTION_NAME].insert_many([
        {"chunkId": f"wills:{i}", "sectionId": "wills", "sectionTitle": "Wills",
         "question": f"Q{i}", "answer": f"A{i}", "embedding": [1.0]}
        for i in range(3)
    ])
    monkeypatch.setattr(faq_search, "_keyword_search", lambda *a, **k: ["wills:0", "wills:1", "wills:2"])
    monkeypatch.setattr(faq_search, "_vector_search", lambda *a, **k: [])

    results = faq_search.faq_search(db, "q", limit=2)

    assert len(results) == 2
