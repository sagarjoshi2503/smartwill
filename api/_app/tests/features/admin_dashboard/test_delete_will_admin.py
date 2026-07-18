from _app.core.config import Settings, get_settings
from _app.main import app
from _app.shared import constants

SAVE_URL = "/api/will/save"


def admin_delete_url(will_id: str) -> str:
    return f"/api/will/admin/{will_id}"


def save_will(client, status="PendingReview", email="jane@example.com"):
    res = client.post(SAVE_URL, json={
        "will": {"testator": {"fullName": "Jane Doe"}},
        "testatorEmail": email,
        "status": status,
    })
    return res.json()["willId"]


# --- positive scenarios ---

def test_admin_deletes_a_pending_review_will(client, fake_db):
    will_id = save_will(client, status="PendingReview")

    res = client.delete(admin_delete_url(will_id))

    assert res.status_code == 200
    assert res.json() == {"willId": will_id}
    assert fake_db["will"].find_one({"willId": will_id}) is None


def test_admin_deletes_a_draft_will(client, fake_db):
    will_id = save_will(client, status="Draft")

    res = client.delete(admin_delete_url(will_id))

    assert res.status_code == 200
    assert fake_db["will"].find_one({"willId": will_id}) is None


def test_admin_delete_does_not_require_owner_email(client, fake_db):
    will_id = save_will(client, status="PendingReview", email="someone@example.com")

    res = client.delete(admin_delete_url(will_id))

    assert res.status_code == 200


def test_admin_delete_also_removes_adminwill_entries(client, fake_db):
    will_id = save_will(client, status="PendingReview")
    assert fake_db["adminwill"].find_one({"willId": will_id}) is not None

    client.delete(admin_delete_url(will_id))

    assert fake_db["adminwill"].find_one({"willId": will_id}) is None


# --- negative scenarios ---

def test_admin_delete_rejects_unknown_will_id(client):
    res = client.delete(admin_delete_url("does-not-exist"))
    assert res.status_code == 404
    assert res.json() == {"error": constants.WILL_NOT_FOUND}


def test_admin_delete_returns_500_when_mongodb_uri_missing():
    app.dependency_overrides[get_settings] = lambda: Settings(mongodb_uri=None)
    try:
        from fastapi.testclient import TestClient
        res = TestClient(app).delete(admin_delete_url("some-id"))
        assert res.status_code == 500
        assert res.json() == {"error": constants.MONGODB_NOT_CONFIGURED}
    finally:
        app.dependency_overrides.clear()
