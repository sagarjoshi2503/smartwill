import mongomock

from ai_usage import log_ai_usage


def _fake_db():
    return mongomock.MongoClient().db["smartwill-test"]


def test_first_call_creates_a_new_row(monkeypatch):
    db = _fake_db()

    log_ai_usage(
        db, email="a@b.com", role="testator", thread_id="t1", model="claude-opus-5",
        input_tokens=100, output_tokens=50, requests=1,
    )

    doc = db["aiusages"].find_one({"emailid": "a@b.com", "threadid": "t1"})
    assert doc["inputtokens"] == 100
    assert doc["outputtokens"] == 50
    assert doc["requests"] == 1
    assert doc["modelname"] == "claude-opus-5"
    assert doc["role"] == "testator"
    assert doc["cost"] > 0
    assert doc["createddate"] is not None
    assert doc["updateddate"] is not None


def test_second_call_in_same_thread_accumulates_not_replaces():
    db = _fake_db()
    log_ai_usage(db, email="a@b.com", role="testator", thread_id="t1", model="claude-opus-5", input_tokens=100, output_tokens=50, requests=1)
    log_ai_usage(db, email="a@b.com", role="testator", thread_id="t1", model="claude-opus-5", input_tokens=20, output_tokens=10, requests=1)

    assert db["aiusages"].count_documents({}) == 1
    doc = db["aiusages"].find_one({"emailid": "a@b.com", "threadid": "t1"})
    assert doc["inputtokens"] == 120
    assert doc["outputtokens"] == 60
    assert doc["requests"] == 2


def test_created_date_unchanged_but_updated_date_refreshed_on_second_call():
    db = _fake_db()
    log_ai_usage(db, email="a@b.com", role="testator", thread_id="t1", model="claude-opus-5", input_tokens=1, output_tokens=1, requests=1)
    first = db["aiusages"].find_one({"emailid": "a@b.com", "threadid": "t1"})

    log_ai_usage(db, email="a@b.com", role="testator", thread_id="t1", model="claude-opus-5", input_tokens=1, output_tokens=1, requests=1)
    second = db["aiusages"].find_one({"emailid": "a@b.com", "threadid": "t1"})

    assert second["createddate"] == first["createddate"]
    assert second["updateddate"] >= first["updateddate"]


def test_different_thread_ids_create_separate_rows():
    db = _fake_db()
    log_ai_usage(db, email="a@b.com", role="testator", thread_id="t1", model="claude-opus-5", input_tokens=1, output_tokens=1, requests=1)
    log_ai_usage(db, email="a@b.com", role="testator", thread_id="t2", model="claude-opus-5", input_tokens=1, output_tokens=1, requests=1)

    assert db["aiusages"].count_documents({"emailid": "a@b.com"}) == 2


def test_different_emails_same_thread_id_create_separate_rows():
    # threadId is a client-generated UUID, effectively unique per browser
    # session already, but the (email, threadId) compound key is what
    # actually guarantees no cross-user collision.
    db = _fake_db()
    log_ai_usage(db, email="a@b.com", role="testator", thread_id="t1", model="claude-opus-5", input_tokens=1, output_tokens=1, requests=1)
    log_ai_usage(db, email="c@d.com", role="testator", thread_id="t1", model="claude-opus-5", input_tokens=1, output_tokens=1, requests=1)

    assert db["aiusages"].count_documents({"threadid": "t1"}) == 2


def test_anonymous_user_logs_with_blank_email():
    db = _fake_db()
    log_ai_usage(db, email="", role=None, thread_id="t1", model="claude-opus-5", input_tokens=1, output_tokens=1, requests=1)

    doc = db["aiusages"].find_one({"emailid": ""})
    assert doc is not None
    assert doc["role"] == ""


def test_cost_computed_from_model_pricing_table():
    db = _fake_db()
    log_ai_usage(db, email="a@b.com", role="testator", thread_id="t1", model="claude-opus-5", input_tokens=1_000_000, output_tokens=1_000_000, requests=1)

    doc = db["aiusages"].find_one({})
    assert doc["cost"] == 15 + 75  # $15/M input + $75/M output at the opus-5 rate table


def test_unknown_model_falls_back_to_default_pricing_not_zero():
    db = _fake_db()
    log_ai_usage(db, email="a@b.com", role="testator", thread_id="t1", model="some-future-model", input_tokens=1_000_000, output_tokens=0, requests=1)

    doc = db["aiusages"].find_one({})
    assert doc["cost"] > 0
