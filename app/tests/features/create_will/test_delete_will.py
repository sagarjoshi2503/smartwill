from app.core.config import Settings, get_settings
from app.main import app
from app.shared import constants

SAVE_URL = "/api/will/save"


def will_url(will_id: str) -> str:
    return f"/api/will/{will_id}"


def save_will(client, status="Draft", email="jane@example.com"):
    res = client.post(SAVE_URL, json={
        "will": {"testator": {"fullName": "Jane Doe"}},
        "testatorEmail": email,
        "status": status,
    })
    return res.json()["willId"]


# --- positive scenarios ---

def test_deletes_a_draft_will(client, fake_db):
    will_id = save_will(client, status="Draft")

    res = client.delete(will_url(will_id), params={"email": "jane@example.com"})

    assert res.status_code == 200
    assert res.json() == {"willId": will_id}
    assert fake_db["will"].find_one({"willId": will_id}) is None


def test_deletes_a_pending_review_will(client, fake_db):
    will_id = save_will(client, status="PendingReview")

    res = client.delete(will_url(will_id), params={"email": "jane@example.com"})

    assert res.status_code == 200
    assert fake_db["will"].find_one({"willId": will_id}) is None


def test_delete_also_removes_adminwill_entries(client, fake_db):
    will_id = save_will(client, status="PendingReview")
    assert fake_db["adminwill"].find_one({"willId": will_id}) is not None

    client.delete(will_url(will_id), params={"email": "jane@example.com"})

    assert fake_db["adminwill"].find_one({"willId": will_id}) is None


def test_is_case_insensitive_on_email(client, fake_db):
    will_id = save_will(client, status="Draft")

    res = client.delete(will_url(will_id), params={"email": "JANE@Example.com"})

    assert res.status_code == 200


# --- negative scenarios ---

def test_rejects_unknown_will_id(client):
    res = client.delete(will_url("does-not-exist"), params={"email": "jane@example.com"})
    assert res.status_code == 404
    assert res.json() == {"error": constants.WILL_NOT_FOUND}


def test_rejects_wrong_owner_email(client, fake_db):
    will_id = save_will(client, status="Draft")

    res = client.delete(will_url(will_id), params={"email": "someone-else@example.com"})

    assert res.status_code == 403
    assert res.json() == {"error": constants.WILL_ACCESS_DENIED}
    assert fake_db["will"].find_one({"willId": will_id}) is not None


def test_rejects_invalid_email_format(client):
    res = client.delete(will_url("some-id"), params={"email": "not-an-email"})
    assert res.status_code == 400
    assert res.json() == {"error": constants.BAD_TESTATOR_EMAIL}


def test_returns_500_when_mongodb_uri_missing():
    app.dependency_overrides[get_settings] = lambda: Settings(mongodb_uri=None)
    try:
        from fastapi.testclient import TestClient
        res = TestClient(app).delete(will_url("some-id"), params={"email": "jane@example.com"})
        assert res.status_code == 500
        assert res.json() == {"error": constants.MONGODB_NOT_CONFIGURED}
    finally:
        app.dependency_overrides.clear()
