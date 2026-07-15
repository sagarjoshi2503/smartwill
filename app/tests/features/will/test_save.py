from app.core.config import Settings, get_settings
from app.main import app

URL = "/api/will/save"
VALID_PAYLOAD = {"will": {"testator": {"fullName": "Jane Doe"}}, "testatorEmail": "jane@example.com"}


# --- positive scenarios ---

def test_save_success_returns_generated_will_id(client, fake_db):
    res = client.post(URL, json=VALID_PAYLOAD)
    assert res.status_code == 201
    will_id = res.json()["willId"]
    assert will_id

    doc = fake_db["will"].find_one({"willId": will_id})
    assert doc["testatorEmail"] == "jane@example.com"
    assert doc["will"]["testator"]["fullName"] == "Jane Doe"
    assert "submittedAt" in doc


def test_save_generates_unique_will_ids_across_requests(client):
    res1 = client.post(URL, json=VALID_PAYLOAD)
    res2 = client.post(URL, json=VALID_PAYLOAD)
    assert res1.json()["willId"] != res2.json()["willId"]


def test_save_ignores_client_supplied_will_id(client, fake_db):
    res = client.post(URL, json={**VALID_PAYLOAD, "willId": "attacker-supplied-id"})
    assert res.status_code == 201
    server_will_id = res.json()["willId"]
    assert server_will_id != "attacker-supplied-id"
    assert fake_db["will"].find_one({"willId": "attacker-supplied-id"}) is None
    assert fake_db["will"].find_one({"willId": server_will_id}) is not None


# --- negative scenarios ---

def test_save_rejects_empty_body(client):
    res = client.post(URL, json={})
    assert res.status_code == 400
    assert res.json() == {"error": "Will data is required."}


def test_save_rejects_malformed_json_body(client):
    res = client.post(URL, content=b"not json", headers={"Content-Type": "application/json"})
    assert res.status_code == 400
    assert res.json() == {"error": "Will data is required."}


def test_save_returns_500_when_mongodb_uri_missing():
    app.dependency_overrides[get_settings] = lambda: Settings(mongodb_uri=None)
    try:
        from fastapi.testclient import TestClient
        res = TestClient(app).post(URL, json=VALID_PAYLOAD)
        assert res.status_code == 500
        assert "MONGODB_URI" in res.json()["error"]
    finally:
        app.dependency_overrides.clear()
