from app.core.config import Settings, get_settings
from app.features.will import service as will_service
from app.main import app
from app.shared import messages

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


def test_save_defaults_to_pending_review_status_when_omitted(client, fake_db):
    res = client.post(URL, json=VALID_PAYLOAD)
    assert res.json()["status"] == "PendingReview"
    doc = fake_db["will"].find_one({"willId": res.json()["willId"]})
    assert doc["status"] == "PendingReview"


def test_save_stores_draft_status(client, fake_db):
    res = client.post(URL, json={**VALID_PAYLOAD, "status": "Draft"})
    assert res.status_code == 201
    assert res.json()["status"] == "Draft"
    doc = fake_db["will"].find_one({"willId": res.json()["willId"]})
    assert doc["status"] == "Draft"


def test_save_stores_pending_review_status(client, fake_db):
    res = client.post(URL, json={**VALID_PAYLOAD, "status": "PendingReview"})
    assert res.json()["status"] == "PendingReview"


def test_save_notifies_admin_email_when_submitted_for_review(client, monkeypatch):
    calls = []
    monkeypatch.setattr(will_service.email, "send_email", lambda settings, to, subject, html: calls.append((to, subject, html)))

    res = client.post(URL, json={**VALID_PAYLOAD, "status": "PendingReview"})

    assert res.status_code == 201
    assert len(calls) == 1
    to, subject, html = calls[0]
    assert to == "anup@prabhuverlekar.com"
    assert "Jane Doe" in subject
    assert res.json()["willId"] in html


def test_save_does_not_notify_admin_email_for_draft(client, monkeypatch):
    calls = []
    monkeypatch.setattr(will_service.email, "send_email", lambda *a, **k: calls.append(1))

    res = client.post(URL, json={**VALID_PAYLOAD, "status": "Draft"})

    assert res.status_code == 201
    assert calls == []


def test_save_creates_adminwill_entry_when_submitted_for_review(client, fake_db):
    res = client.post(URL, json={**VALID_PAYLOAD, "status": "PendingReview"})

    assert res.status_code == 201
    entry = fake_db["adminwill"].find_one({"willId": res.json()["willId"]})
    assert entry is not None
    assert entry["adminEmail"] == "anup@prabhuverlekar.com"
    assert "assignedAt" in entry


def test_save_does_not_create_adminwill_entry_for_draft(client, fake_db):
    res = client.post(URL, json={**VALID_PAYLOAD, "status": "Draft"})

    assert res.status_code == 201
    assert fake_db["adminwill"].count_documents({}) == 0


# --- negative scenarios ---

def test_save_rejects_empty_body(client):
    res = client.post(URL, json={})
    assert res.status_code == 400
    assert res.json() == {"error": messages.WILL_DATA_REQUIRED}


def test_save_rejects_malformed_json_body(client):
    res = client.post(URL, content=b"not json", headers={"Content-Type": "application/json"})
    assert res.status_code == 400
    assert res.json() == {"error": messages.WILL_DATA_REQUIRED}


def test_save_rejects_invalid_status(client):
    res = client.post(URL, json={**VALID_PAYLOAD, "status": "Bogus"})
    assert res.status_code == 400
    assert res.json() == {"error": messages.INVALID_WILL_STATUS}


def test_save_returns_500_when_mongodb_uri_missing():
    app.dependency_overrides[get_settings] = lambda: Settings(mongodb_uri=None)
    try:
        from fastapi.testclient import TestClient
        res = TestClient(app).post(URL, json=VALID_PAYLOAD)
        assert res.status_code == 500
        assert res.json() == {"error": messages.MONGODB_NOT_CONFIGURED}
    finally:
        app.dependency_overrides.clear()
