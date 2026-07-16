from app.core.config import Settings, get_settings
from app.main import app
from app.shared import messages

SAVE_URL = "/api/will/save"


def will_url(will_id: str) -> str:
    return f"/api/will/{will_id}"


# --- positive scenarios ---

def test_returns_the_will_when_owned_by_the_given_email(client, fake_db):
    saved = client.post(SAVE_URL, json={
        "will": {"testator": {"fullName": "Jane Doe"}},
        "testatorEmail": "jane@example.com",
        "status": "Draft",
    })
    will_id = saved.json()["willId"]

    res = client.get(will_url(will_id), params={"email": "jane@example.com"})

    assert res.status_code == 200
    body = res.json()
    assert body["willId"] == will_id
    assert body["testatorEmail"] == "jane@example.com"
    assert body["status"] == "Draft"
    assert body["will"]["testator"]["fullName"] == "Jane Doe"


def test_is_case_insensitive_on_email(client, fake_db):
    saved = client.post(SAVE_URL, json={
        "will": {"testator": {"fullName": "Jane Doe"}},
        "testatorEmail": "jane@example.com",
        "status": "Draft",
    })
    will_id = saved.json()["willId"]

    res = client.get(will_url(will_id), params={"email": "JANE@Example.com"})

    assert res.status_code == 200


# --- negative scenarios ---

def test_rejects_unknown_will_id(client):
    res = client.get(will_url("does-not-exist"), params={"email": "jane@example.com"})
    assert res.status_code == 404
    assert res.json() == {"error": messages.WILL_NOT_FOUND}


def test_rejects_wrong_owner_email(client, fake_db):
    saved = client.post(SAVE_URL, json={
        "will": {"testator": {"fullName": "Jane Doe"}},
        "testatorEmail": "jane@example.com",
        "status": "Draft",
    })
    will_id = saved.json()["willId"]

    res = client.get(will_url(will_id), params={"email": "someone-else@example.com"})

    assert res.status_code == 403
    assert res.json() == {"error": messages.WILL_ACCESS_DENIED}


def test_rejects_invalid_email_format(client):
    res = client.get(will_url("some-id"), params={"email": "not-an-email"})
    assert res.status_code == 400
    assert res.json() == {"error": messages.INVALID_TESTATOR_EMAIL}


def test_returns_500_when_mongodb_uri_missing():
    app.dependency_overrides[get_settings] = lambda: Settings(mongodb_uri=None)
    try:
        from fastapi.testclient import TestClient
        res = TestClient(app).get(will_url("some-id"), params={"email": "jane@example.com"})
        assert res.status_code == 500
        assert res.json() == {"error": messages.MONGODB_NOT_CONFIGURED}
    finally:
        app.dependency_overrides.clear()
