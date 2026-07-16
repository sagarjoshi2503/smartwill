from datetime import datetime, timedelta, timezone

from app.core.config import Settings, get_settings
from app.main import app
from app.shared import messages

URL = "/api/will/my-wills"


def seed_will(fake_db, will_id, full_name, testator_email, created_at, status="Draft"):
    fake_db["will"].insert_one({
        "willId": will_id,
        "will": {"testator": {"fullName": full_name}},
        "testatorEmail": testator_email,
        "createdAt": created_at,
        "submittedAt": created_at,
        "status": status,
    })


# --- positive scenarios ---

def test_returns_only_this_testators_wills(client, fake_db):
    now = datetime.now(timezone.utc)
    seed_will(fake_db, "will-1", "Jane Doe", "jane@example.com", now)
    seed_will(fake_db, "will-2", "John Roe", "john@example.com", now)

    res = client.get(URL, params={"email": "jane@example.com"})

    assert res.status_code == 200
    wills = res.json()["wills"]
    assert len(wills) == 1
    assert wills[0]["willId"] == "will-1"
    assert wills[0]["testatorEmail"] == "jane@example.com"
    assert wills[0]["fullLegalName"] == "Jane Doe"


def test_includes_both_draft_and_pending_review_wills(client, fake_db):
    now = datetime.now(timezone.utc)
    seed_will(fake_db, "will-1", "Jane Doe", "jane@example.com", now, status="Draft")
    seed_will(fake_db, "will-2", "Jane Doe", "jane@example.com", now, status="PendingReview")

    res = client.get(URL, params={"email": "jane@example.com"})

    statuses = {w["status"] for w in res.json()["wills"]}
    assert statuses == {"Draft", "PendingReview"}


def test_is_case_insensitive_on_testator_email(client, fake_db):
    now = datetime.now(timezone.utc)
    seed_will(fake_db, "will-1", "Jane Doe", "jane@example.com", now)

    res = client.get(URL, params={"email": "JANE@Example.com"})

    assert res.status_code == 200
    assert len(res.json()["wills"]) == 1


def test_returns_multiple_wills_sorted_most_recent_first(client, fake_db):
    now = datetime.now(timezone.utc)
    seed_will(fake_db, "will-1", "Older Draft", "jane@example.com", now - timedelta(days=1))
    seed_will(fake_db, "will-2", "Newer Draft", "jane@example.com", now)

    res = client.get(URL, params={"email": "jane@example.com"})

    names = [w["fullLegalName"] for w in res.json()["wills"]]
    assert names == ["Newer Draft", "Older Draft"]


def test_returns_empty_list_when_testator_has_no_wills(client):
    res = client.get(URL, params={"email": "jane@example.com"})
    assert res.status_code == 200
    assert res.json() == {"wills": []}


# --- negative scenarios ---

def test_excludes_wills_created_more_than_30_days_ago(client, fake_db):
    now = datetime.now(timezone.utc)
    seed_will(fake_db, "will-1", "Old Will", "jane@example.com", now - timedelta(days=31))

    res = client.get(URL, params={"email": "jane@example.com"})

    assert res.status_code == 200
    assert res.json() == {"wills": []}


def test_rejects_missing_email(client):
    res = client.get(URL)
    assert res.status_code == 400
    assert res.json() == {"error": messages.INVALID_TESTATOR_EMAIL}


def test_rejects_invalid_email_format(client):
    res = client.get(URL, params={"email": "not-an-email"})
    assert res.status_code == 400
    assert res.json() == {"error": messages.INVALID_TESTATOR_EMAIL}


def test_returns_500_when_mongodb_uri_missing():
    app.dependency_overrides[get_settings] = lambda: Settings(mongodb_uri=None)
    try:
        from fastapi.testclient import TestClient
        res = TestClient(app).get(URL, params={"email": "jane@example.com"})
        assert res.status_code == 500
        assert res.json() == {"error": messages.MONGODB_NOT_CONFIGURED}
    finally:
        app.dependency_overrides.clear()
