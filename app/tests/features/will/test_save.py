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
    assert "updatedAt" in doc


def test_save_strips_id_numbers_before_persisting(client, fake_db):
    payload = {
        "will": {
            "testator": {"fullName": "Jane Doe", "idNumber": "AAAAA1111A"},
            "executor": {"name": "Bob", "idNumber": "BBBBB2222B", "jointIdNumber": "CCCCC3333C", "subIdNumber": "DDDDD4444D"},
            "guardian": {"name": "Carol", "idNumber": "EEEEE5555E", "subIdNumber": "FFFFF6666F"},
            "residualIdNumber": "GGGGG7777G",
        },
        "testatorEmail": "jane@example.com",
    }

    res = client.post(URL, json=payload)

    assert res.status_code == 201
    doc = fake_db["will"].find_one({"willId": res.json()["willId"]})
    assert doc["will"]["testator"]["idNumber"] == ""
    assert doc["will"]["executor"]["idNumber"] == ""
    assert doc["will"]["executor"]["jointIdNumber"] == ""
    assert doc["will"]["executor"]["subIdNumber"] == ""
    assert doc["will"]["guardian"]["idNumber"] == ""
    assert doc["will"]["guardian"]["subIdNumber"] == ""
    assert doc["will"]["residualIdNumber"] == ""
    # Non-ID fields must survive redaction untouched.
    assert doc["will"]["testator"]["fullName"] == "Jane Doe"
    assert doc["will"]["executor"]["name"] == "Bob"
    assert doc["will"]["guardian"]["name"] == "Carol"


def test_save_generates_unique_will_ids_across_requests(client):
    res1 = client.post(URL, json=VALID_PAYLOAD)
    res2 = client.post(URL, json=VALID_PAYLOAD)
    assert res1.json()["willId"] != res2.json()["willId"]


def test_save_updates_existing_draft_when_will_id_provided(client, fake_db):
    first = client.post(URL, json={**VALID_PAYLOAD, "status": "Draft"})
    will_id = first.json()["willId"]

    updated_payload = {
        "will": {"testator": {"fullName": "Jane Updated"}},
        "testatorEmail": "jane@example.com",
        "status": "Draft",
        "willId": will_id,
    }
    second = client.post(URL, json=updated_payload)

    assert second.status_code == 201
    assert second.json()["willId"] == will_id
    assert fake_db["will"].count_documents({}) == 1
    doc = fake_db["will"].find_one({"willId": will_id})
    assert doc["will"]["testator"]["fullName"] == "Jane Updated"


def test_save_preserves_created_at_across_updates(client, fake_db):
    first = client.post(URL, json={**VALID_PAYLOAD, "status": "Draft"})
    will_id = first.json()["willId"]
    created_at = fake_db["will"].find_one({"willId": will_id})["createdAt"]

    client.post(URL, json={**VALID_PAYLOAD, "status": "Draft", "willId": will_id})

    assert fake_db["will"].find_one({"willId": will_id})["createdAt"] == created_at


def test_save_can_transition_an_existing_draft_to_pending_review(client, fake_db):
    first = client.post(URL, json={**VALID_PAYLOAD, "status": "Draft"})
    will_id = first.json()["willId"]

    second = client.post(URL, json={**VALID_PAYLOAD, "status": "PendingReview", "willId": will_id})

    assert second.status_code == 201
    assert second.json()["status"] == "PendingReview"
    assert fake_db["will"].find_one({"willId": will_id})["status"] == "PendingReview"


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


def test_save_rejects_missing_testator_email(client):
    res = client.post(URL, json={"will": {"testator": {"fullName": "Jane Doe"}}})
    assert res.status_code == 400
    assert res.json() == {"error": messages.INVALID_TESTATOR_EMAIL}


def test_save_rejects_invalid_testator_email(client):
    res = client.post(URL, json={**VALID_PAYLOAD, "testatorEmail": "not-an-email"})
    assert res.status_code == 400
    assert res.json() == {"error": messages.INVALID_TESTATOR_EMAIL}


def test_save_rejects_unknown_will_id(client):
    res = client.post(URL, json={**VALID_PAYLOAD, "willId": "does-not-exist"})
    assert res.status_code == 404
    assert res.json() == {"error": messages.WILL_NOT_FOUND}


def test_save_rejects_updating_will_owned_by_a_different_testator(client, fake_db):
    first = client.post(URL, json={**VALID_PAYLOAD, "status": "Draft"})
    will_id = first.json()["willId"]

    res = client.post(URL, json={
        "will": {"testator": {"fullName": "Someone Else"}},
        "testatorEmail": "someone-else@example.com",
        "status": "Draft",
        "willId": will_id,
    })

    assert res.status_code == 403
    assert res.json() == {"error": messages.WILL_ACCESS_DENIED}


def test_save_rejects_editing_a_will_pending_review(client, fake_db):
    first = client.post(URL, json={**VALID_PAYLOAD, "status": "PendingReview"})
    will_id = first.json()["willId"]

    res = client.post(URL, json={**VALID_PAYLOAD, "status": "Draft", "willId": will_id})

    assert res.status_code == 403
    assert res.json() == {"error": messages.WILL_LOCKED_FOR_REVIEW}


def test_save_returns_500_when_mongodb_uri_missing():
    app.dependency_overrides[get_settings] = lambda: Settings(mongodb_uri=None)
    try:
        from fastapi.testclient import TestClient
        res = TestClient(app).post(URL, json=VALID_PAYLOAD)
        assert res.status_code == 500
        assert res.json() == {"error": messages.MONGODB_NOT_CONFIGURED}
    finally:
        app.dependency_overrides.clear()
