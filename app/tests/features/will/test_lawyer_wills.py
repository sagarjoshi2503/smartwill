from datetime import datetime, timezone

from app.core.config import Settings, get_settings
from app.main import app

URL = "/api/will/lawyer-wills"


def seed_will(fake_db, will_id, full_name, testator_email, submitted_at):
    fake_db["will"].insert_one({
        "willId": will_id,
        "will": {"testator": {"fullName": full_name}},
        "testatorEmail": testator_email,
        "submittedAt": submitted_at,
    })


# --- positive scenarios ---

def test_returns_only_wills_assigned_to_this_lawyer(client, fake_db):
    seed_will(fake_db, "will-1", "Jane Doe", "jane@example.com", datetime(2026, 1, 1, tzinfo=timezone.utc))
    seed_will(fake_db, "will-2", "John Roe", "john@example.com", datetime(2026, 1, 2, tzinfo=timezone.utc))
    fake_db["lawyerwill"].insert_one({"willId": "will-1", "lawyerEmail": "lawyer@lawfirm.com"})
    fake_db["lawyerwill"].insert_one({"willId": "will-2", "lawyerEmail": "someone-else@lawfirm.com"})

    res = client.get(URL, params={"email": "lawyer@lawfirm.com"})
    assert res.status_code == 200
    clients = res.json()["clients"]
    assert len(clients) == 1
    assert clients[0]["willId"] == "will-1"
    assert clients[0]["name"] == "Jane Doe"
    assert clients[0]["contact"] == "jane@example.com"
    assert clients[0]["updatedAt"] == "2026-01-01T00:00:00"


def test_returns_multiple_wills_sorted_most_recent_first(client, fake_db):
    seed_will(fake_db, "will-1", "Older Client", "older@example.com", datetime(2026, 1, 1, tzinfo=timezone.utc))
    seed_will(fake_db, "will-2", "Newer Client", "newer@example.com", datetime(2026, 2, 1, tzinfo=timezone.utc))
    fake_db["lawyerwill"].insert_one({"willId": "will-1", "lawyerEmail": "lawyer@lawfirm.com"})
    fake_db["lawyerwill"].insert_one({"willId": "will-2", "lawyerEmail": "lawyer@lawfirm.com"})

    res = client.get(URL, params={"email": "lawyer@lawfirm.com"})
    names = [c["name"] for c in res.json()["clients"]]
    assert names == ["Newer Client", "Older Client"]


def test_is_case_insensitive_on_lawyer_email(client, fake_db):
    seed_will(fake_db, "will-1", "Jane Doe", "jane@example.com", datetime(2026, 1, 1, tzinfo=timezone.utc))
    fake_db["lawyerwill"].insert_one({"willId": "will-1", "lawyerEmail": "lawyer@lawfirm.com"})

    res = client.get(URL, params={"email": "LAWYER@LawFirm.com"})
    assert res.status_code == 200
    assert len(res.json()["clients"]) == 1


def test_returns_empty_list_when_lawyer_has_no_assigned_wills(client):
    res = client.get(URL, params={"email": "lawyer@lawfirm.com"})
    assert res.status_code == 200
    assert res.json() == {"clients": []}


# --- negative scenarios ---

def test_rejects_missing_email(client):
    res = client.get(URL)
    assert res.status_code == 400
    assert res.json() == {"error": "Enter a valid lawyer email address."}


def test_rejects_invalid_email_format(client):
    res = client.get(URL, params={"email": "not-an-email"})
    assert res.status_code == 400
    assert res.json() == {"error": "Enter a valid lawyer email address."}


def test_returns_500_when_mongodb_uri_missing():
    app.dependency_overrides[get_settings] = lambda: Settings(mongodb_uri=None)
    try:
        from fastapi.testclient import TestClient
        res = TestClient(app).get(URL, params={"email": "lawyer@lawfirm.com"})
        assert res.status_code == 500
        assert "MONGODB_URI" in res.json()["error"]
    finally:
        app.dependency_overrides.clear()
