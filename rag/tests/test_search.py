import mongomock

import search
from constants import ROLE_ADMIN, ROLE_TESTATOR


# --- _cosine_similarity ---

def test_cosine_similarity_identical_vectors_is_one():
    assert search._cosine_similarity([1, 2, 3], [1, 2, 3]) == 1.0


def test_cosine_similarity_orthogonal_vectors_is_zero():
    assert search._cosine_similarity([1, 0], [0, 1]) == 0.0


def test_cosine_similarity_zero_vector_is_zero_not_a_crash():
    assert search._cosine_similarity([0, 0], [1, 2]) == 0.0


# --- _ownership_filter ---

def test_ownership_filter_scopes_testator_to_own_email():
    assert search._ownership_filter(ROLE_TESTATOR, "a@b.com") == {"testatorEmail": "a@b.com"}


def test_ownership_filter_admin_is_unrestricted():
    assert search._ownership_filter(ROLE_ADMIN, "admin@b.com") == {}


# --- _reciprocal_rank_fusion ---

def test_rrf_ranks_items_appearing_in_both_lists_highest():
    keyword = ["w1", "w2", "w3"]
    vector = ["w2", "w1", "w4"]
    fused = search._reciprocal_rank_fusion([keyword, vector])
    fused_ids = [item_id for item_id, _ in fused]
    # w1 and w2 each appear near the top of both lists — they should
    # outrank w3/w4, which only appear in one list each.
    assert set(fused_ids[:2]) == {"w1", "w2"}
    assert "w3" in fused_ids
    assert "w4" in fused_ids


def test_rrf_handles_empty_lists():
    assert search._reciprocal_rank_fusion([[], []]) == []


def test_rrf_single_list_preserves_order():
    fused = search._reciprocal_rank_fusion([["a", "b", "c"]])
    assert [item_id for item_id, _ in fused] == ["a", "b", "c"]


# --- _vector_search (mongomock; embed_query monkeypatched) ---

def _fake_db_with_chunks():
    db = mongomock.MongoClient().db["smartwill-test"]
    db["rag_will_chunks"].insert_many([
        {"willId": "mine", "testatorEmail": "a@b.com", "embedding": [1.0, 0.0]},
        {"willId": "not-mine", "testatorEmail": "other@b.com", "embedding": [1.0, 0.0]},
    ])
    return db


def test_vector_search_scopes_results_to_testator_email(monkeypatch):
    db = _fake_db_with_chunks()
    monkeypatch.setattr(search, "embed_query", lambda q: [1.0, 0.0])

    result = search._vector_search(db, "anything", ROLE_TESTATOR, "a@b.com", pool_size=10)

    assert result == ["mine"]


def test_vector_search_admin_sees_everyone(monkeypatch):
    db = _fake_db_with_chunks()
    monkeypatch.setattr(search, "embed_query", lambda q: [1.0, 0.0])

    result = search._vector_search(db, "anything", ROLE_ADMIN, "admin@b.com", pool_size=10)

    assert set(result) == {"mine", "not-mine"}


# --- hybrid_search (keyword/vector search stubbed out — exercised separately) ---

def test_hybrid_search_includes_testator_email_only_for_admin(monkeypatch):
    db = mongomock.MongoClient().db["smartwill-test"]
    db["rag_will_chunks"].insert_one({
        "willId": "w1", "testatorEmail": "a@b.com", "willType": "allindia", "status": "Draft",
        "text": "a fairly short snippet of will text", "embedding": [1.0],
    })
    monkeypatch.setattr(search, "_keyword_search", lambda *a, **k: ["w1"])
    monkeypatch.setattr(search, "_vector_search", lambda *a, **k: ["w1"])

    testator_results = search.hybrid_search(db, "q", ROLE_TESTATOR, "a@b.com", limit=5)
    admin_results = search.hybrid_search(db, "q", ROLE_ADMIN, "admin@b.com", limit=5)

    assert "testatorEmail" not in testator_results[0]
    assert admin_results[0]["testatorEmail"] == "a@b.com"


def test_hybrid_search_returns_empty_list_when_nothing_matches(monkeypatch):
    db = mongomock.MongoClient().db["smartwill-test"]
    monkeypatch.setattr(search, "_keyword_search", lambda *a, **k: [])
    monkeypatch.setattr(search, "_vector_search", lambda *a, **k: [])

    assert search.hybrid_search(db, "q", ROLE_TESTATOR, "a@b.com", limit=5) == []


def test_hybrid_search_truncates_long_snippets(monkeypatch):
    db = mongomock.MongoClient().db["smartwill-test"]
    long_text = "x" * 500
    db["rag_will_chunks"].insert_one({
        "willId": "w1", "testatorEmail": "a@b.com", "willType": "allindia", "status": "Draft",
        "text": long_text, "embedding": [1.0],
    })
    monkeypatch.setattr(search, "_keyword_search", lambda *a, **k: ["w1"])
    monkeypatch.setattr(search, "_vector_search", lambda *a, **k: [])

    results = search.hybrid_search(db, "q", ROLE_TESTATOR, "a@b.com", limit=5)

    assert len(results[0]["snippet"]) < len(long_text)
    assert results[0]["snippet"].endswith("…")
