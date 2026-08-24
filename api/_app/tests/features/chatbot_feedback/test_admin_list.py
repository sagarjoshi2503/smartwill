from datetime import datetime, timezone

URL = "/api/chatbot-feedback/admin/list"


def _insert(fake_db, **overrides):
    doc = {
        "emailid": "jane@example.com",
        "question": "How do I revoke a will?",
        "answer": "You can revoke it by...",
        "responsedatetime": datetime(2026, 1, 15, 10, 30, tzinfo=timezone.utc),
        "notlikedreason": "",
        **overrides,
    }
    fake_db["chatbotresponses"].insert_one(doc)
    return doc


def test_admin_list_returns_all_feedback(client, fake_db, admin_auth_headers):
    _insert(fake_db)
    _insert(fake_db, emailid="bob@example.com", question="q2", answer="a2", notlikedreason="too vague")

    res = client.get(URL, headers=admin_auth_headers())

    assert res.status_code == 200
    items = res.json()["feedback"]
    assert len(items) == 2
    assert {i["emailid"] for i in items} == {"jane@example.com", "bob@example.com"}


def test_admin_list_includes_every_field(client, fake_db, admin_auth_headers):
    _insert(fake_db)

    res = client.get(URL, headers=admin_auth_headers())

    item = res.json()["feedback"][0]
    assert item["emailid"] == "jane@example.com"
    assert item["question"] == "How do I revoke a will?"
    assert item["answer"] == "You can revoke it by..."
    # pymongo (real driver too, not just mongomock) round-trips datetimes
    # as naive (strips tzinfo) — this confirms the service layer both
    # calls .isoformat() (rather than returning the raw datetime object,
    # which FastAPI/pydantic couldn't serialize to `str`) and re-attaches
    # UTC before doing so (see the explicit-offset test below).
    assert item["responsedatetime"].startswith("2026-01-15T10:30:00")
    assert item["notlikedreason"] == ""


def test_admin_list_response_datetime_carries_an_explicit_utc_offset(client, fake_db, admin_auth_headers):
    # Without this, a frontend `new Date(...)` on this string would be
    # misread as local time instead of UTC (see service.py's _iso()).
    _insert(fake_db)

    res = client.get(URL, headers=admin_auth_headers())

    assert res.json()["feedback"][0]["responsedatetime"].endswith("+00:00")


def test_admin_list_sorted_most_recent_first(client, fake_db, admin_auth_headers):
    _insert(fake_db, emailid="older@example.com", responsedatetime=datetime(2026, 1, 1, tzinfo=timezone.utc))
    _insert(fake_db, emailid="newer@example.com", responsedatetime=datetime(2026, 1, 20, tzinfo=timezone.utc))

    res = client.get(URL, headers=admin_auth_headers())

    emails = [i["emailid"] for i in res.json()["feedback"]]
    assert emails == ["newer@example.com", "older@example.com"]


def test_admin_list_filters_by_search_across_email_question_answer(client, fake_db, admin_auth_headers):
    _insert(fake_db, emailid="jane@example.com", question="about executors", answer="an executor is...")
    _insert(fake_db, emailid="bob@example.com", question="about guardians", answer="a guardian is...")

    res = client.get(URL, headers=admin_auth_headers(), params={"search": "executor"})

    items = res.json()["feedback"]
    assert len(items) == 1
    assert items[0]["emailid"] == "jane@example.com"


def test_admin_list_empty_collection_returns_empty_list(client, admin_auth_headers):
    res = client.get(URL, headers=admin_auth_headers())

    assert res.status_code == 200
    assert res.json() == {"feedback": []}


def test_admin_list_requires_auth(client):
    res = client.get(URL)
    assert res.status_code == 401


def test_admin_list_rejects_testator_token(client, testator_auth_headers):
    res = client.get(URL, headers=testator_auth_headers())
    assert res.status_code == 401
