from datetime import datetime, timezone

from app.core.config import Settings, get_settings
from app.main import app
from app.shared import messages

URL = "/api/will/lawyer-wills"


def seed_will(fake_db, will_id, full_name, testator_email, submitted_at, status="PendingReview"):
    fake_db["will"].insert_one({
        "willId": will_id,
        "will": {"testator": {"fullName": full_name}},
        "testatorEmail": testator_email,
        "submittedAt": submitted_at,
        "status": status,
    })


# --- positive scenarios ---

def test_returns_all_wills_submitted_for_review(client, fake_db):
    seed_will(fake_db, "will-1", "Jane Doe", "jane@example.com", datetime(2026, 1, 1, tzinfo=timezone.utc))
    seed_will(fake_db, "will-2", "John Roe", "john@example.com", datetime(2026, 1, 2, tzinfo=timezone.utc))

    res = client.get(URL)

    assert res.status_code == 200
    clients = res.json()["clients"]
    assert len(clients) == 2
    names = {c["name"] for c in clients}
    assert names == {"Jane Doe", "John Roe"}


def test_includes_status_for_each_will(client, fake_db):
    seed_will(fake_db, "will-1", "Jane Doe", "jane@example.com", datetime(2026, 1, 1, tzinfo=timezone.utc), status="PendingReview")
    seed_will(fake_db, "will-2", "Draft Client", "draft@example.com", datetime(2026, 1, 1, tzinfo=timezone.utc), status="Draft")
    seed_will(fake_db, "will-3", "Done Client", "done@example.com", datetime(2026, 1, 1, tzinfo=timezone.utc), status="Completed")

    res = client.get(URL)

    statuses = {c["name"]: c["status"] for c in res.json()["clients"]}
    assert statuses == {"Jane Doe": "PendingReview", "Draft Client": "Draft", "Done Client": "Completed"}


def test_returns_multiple_wills_sorted_most_recent_first(client, fake_db):
    seed_will(fake_db, "will-1", "Older Client", "older@example.com", datetime(2026, 1, 1, tzinfo=timezone.utc))
    seed_will(fake_db, "will-2", "Newer Client", "newer@example.com", datetime(2026, 2, 1, tzinfo=timezone.utc))

    res = client.get(URL)

    names = [c["name"] for c in res.json()["clients"]]
    assert names == ["Newer Client", "Older Client"]


def test_returns_empty_list_when_no_wills_submitted(client):
    res = client.get(URL)
    assert res.status_code == 200
    assert res.json() == {"clients": []}


# --- negative scenarios ---

def test_returns_500_when_mongodb_uri_missing():
    app.dependency_overrides[get_settings] = lambda: Settings(mongodb_uri=None)
    try:
        from fastapi.testclient import TestClient
        res = TestClient(app).get(URL)
        assert res.status_code == 500
        assert res.json() == {"error": messages.MONGODB_NOT_CONFIGURED}
    finally:
        app.dependency_overrides.clear()
