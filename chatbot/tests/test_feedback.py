import mongomock
from fastapi.testclient import TestClient

import main


def _fake_db():
    return mongomock.MongoClient().db["smartwill-test"]


def _client(monkeypatch, db):
    monkeypatch.setattr(main, "get_db", lambda: db)
    return TestClient(main.app)


VALID_LIKED = {"email": "a@b.com", "question": "What is a Will?", "answer": "A legal document.", "liked": True}


def test_thumbs_up_stores_entry_with_blank_reason(monkeypatch):
    db = _fake_db()
    client = _client(monkeypatch, db)

    res = client.post("/chat/feedback", json=VALID_LIKED)

    assert res.status_code == 200
    assert res.json() == {"ok": True}
    doc = db["chatbotresponses"].find_one({"emailid": "a@b.com"})
    assert doc["question"] == "What is a Will?"
    assert doc["answer"] == "A legal document."
    assert doc["notlikedreason"] == ""
    assert "responsedatetime" in doc


def test_thumbs_up_ignores_any_client_supplied_reason(monkeypatch):
    db = _fake_db()
    client = _client(monkeypatch, db)

    client.post("/chat/feedback", json={**VALID_LIKED, "reason": "should be ignored"})

    doc = db["chatbotresponses"].find_one({})
    assert doc["notlikedreason"] == ""


def test_thumbs_down_requires_a_reason(monkeypatch):
    db = _fake_db()
    client = _client(monkeypatch, db)

    res = client.post("/chat/feedback", json={**VALID_LIKED, "liked": False})

    assert res.status_code == 400
    assert db["chatbotresponses"].count_documents({}) == 0


def test_thumbs_down_rejects_blank_reason(monkeypatch):
    db = _fake_db()
    client = _client(monkeypatch, db)

    res = client.post("/chat/feedback", json={**VALID_LIKED, "liked": False, "reason": "   "})

    assert res.status_code == 400
    assert db["chatbotresponses"].count_documents({}) == 0


def test_thumbs_down_rejects_reason_over_150_characters(monkeypatch):
    db = _fake_db()
    client = _client(monkeypatch, db)

    res = client.post("/chat/feedback", json={**VALID_LIKED, "liked": False, "reason": "x" * 151})

    assert res.status_code == 400
    assert db["chatbotresponses"].count_documents({}) == 0


def test_thumbs_down_accepts_reason_at_exactly_150_characters(monkeypatch):
    db = _fake_db()
    client = _client(monkeypatch, db)

    res = client.post("/chat/feedback", json={**VALID_LIKED, "liked": False, "reason": "x" * 150})

    assert res.status_code == 200
    doc = db["chatbotresponses"].find_one({})
    assert doc["notlikedreason"] == "x" * 150


def test_thumbs_down_stores_trimmed_reason(monkeypatch):
    db = _fake_db()
    client = _client(monkeypatch, db)

    client.post("/chat/feedback", json={**VALID_LIKED, "liked": False, "reason": "  too generic  "})

    doc = db["chatbotresponses"].find_one({})
    assert doc["notlikedreason"] == "too generic"


def test_rejects_blank_question_or_answer(monkeypatch):
    db = _fake_db()
    client = _client(monkeypatch, db)

    res = client.post("/chat/feedback", json={**VALID_LIKED, "question": "   "})

    assert res.status_code == 400
    assert db["chatbotresponses"].count_documents({}) == 0


def test_anonymous_visitor_stores_blank_email(monkeypatch):
    db = _fake_db()
    client = _client(monkeypatch, db)

    res = client.post("/chat/feedback", json={**VALID_LIKED, "email": None})

    assert res.status_code == 200
    doc = db["chatbotresponses"].find_one({})
    assert doc["emailid"] == ""
