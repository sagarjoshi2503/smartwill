import jwt

from _app.core.config import Settings, get_settings
from _app.features.admin_dashboard import service as admin_service
from _app.main import app
from _app.shared import constants
from _app.shared.constants import JWT_ALGORITHM, ROLE_ADMIN, ROLE_TESTATOR

SAVE_URL = "/api/will/save"
ADMIN_EMAIL = "admin@forwardlegacy.co.in"


def get_admin_url(will_id: str) -> str:
    return f"/api/will/admin/{will_id}"


def complete_admin_url(will_id: str) -> str:
    return f"/api/will/admin/{will_id}/complete"


def send_back_admin_url(will_id: str) -> str:
    return f"/api/will/admin/{will_id}/send-back"


ADMIN_SAVE_URL = "/api/will/admin/save"


def _token(email, role):
    return jwt.encode({"sub": email, "role": role}, "test-secret-key", algorithm=JWT_ALGORITHM)


def auth_testator(email="jane@example.com"):
    return {"Authorization": f"Bearer {_token(email, ROLE_TESTATOR)}"}


def auth_admin(email=ADMIN_EMAIL):
    return {"Authorization": f"Bearer {_token(email, ROLE_ADMIN)}"}


ADMIN_AUTH = auth_admin()


def save_will(client, status="PendingReview", email="jane@example.com", full_name="Jane Doe"):
    res = client.post(SAVE_URL, headers=auth_testator(email), json={
        "will": {"testator": {"fullName": full_name}},
        "testatorEmail": email,
        "status": status,
    })
    return res.json()["willId"]


# --- GET /api/will/admin/{will_id} ---

def test_admin_get_returns_the_will_regardless_of_owner(client, fake_db):
    will_id = save_will(client, status="PendingReview")

    res = client.get(get_admin_url(will_id), headers=ADMIN_AUTH)

    assert res.status_code == 200
    body = res.json()
    assert body["willId"] == will_id
    assert body["status"] == "PendingReview"
    assert body["will"]["testator"]["fullName"] == "Jane Doe"


def test_admin_get_rejects_unknown_will_id(client):
    res = client.get(get_admin_url("does-not-exist"), headers=ADMIN_AUTH)
    assert res.status_code == 404
    assert res.json() == {"error": constants.WILL_NOT_FOUND}


def test_admin_get_rejects_missing_auth_token(client, fake_db):
    will_id = save_will(client, status="PendingReview")
    res = client.get(get_admin_url(will_id))
    assert res.status_code == 401


def test_admin_get_rejects_testator_token(client, fake_db):
    will_id = save_will(client, status="PendingReview")
    res = client.get(get_admin_url(will_id), headers=auth_testator())
    assert res.status_code == 401


# --- POST /api/will/admin/{will_id}/complete ---

def test_admin_complete_marks_status_completed(client, fake_db):
    will_id = save_will(client, status="PendingReview")

    res = client.post(complete_admin_url(will_id), headers=ADMIN_AUTH, json={})

    assert res.status_code == 200
    assert res.json() == {"willId": will_id, "status": "Completed"}
    doc = fake_db["will"].find_one({"willId": will_id})
    assert doc["status"] == "Completed"


def test_admin_complete_saves_edited_will_content(client, fake_db):
    will_id = save_will(client, status="PendingReview", full_name="Jane Doe")

    res = client.post(complete_admin_url(will_id), headers=ADMIN_AUTH, json={
        "will": {"testator": {"fullName": "Jane Doe Edited"}},
    })

    assert res.status_code == 200
    doc = fake_db["will"].find_one({"willId": will_id})
    assert doc["will"]["testator"]["fullName"] == "Jane Doe Edited"


def test_admin_complete_strips_id_numbers_from_edited_will(client, fake_db):
    will_id = save_will(client, status="PendingReview", full_name="Jane Doe")

    res = client.post(complete_admin_url(will_id), headers=ADMIN_AUTH, json={
        "will": {"testator": {"fullName": "Jane Doe", "pan": "AAAAA1111A"}},
    })

    assert res.status_code == 200
    doc = fake_db["will"].find_one({"willId": will_id})
    assert doc["will"]["testator"]["pan"] == ""


def test_admin_complete_preserves_will_content_when_not_provided(client, fake_db):
    will_id = save_will(client, status="PendingReview", full_name="Jane Doe")

    client.post(complete_admin_url(will_id), headers=ADMIN_AUTH, json={})

    doc = fake_db["will"].find_one({"willId": will_id})
    assert doc["will"]["testator"]["fullName"] == "Jane Doe"


def test_admin_complete_updates_status_in_will_tracker_list(client, fake_db):
    will_id = save_will(client, status="PendingReview")

    client.post(complete_admin_url(will_id), headers=ADMIN_AUTH, json={})

    res = client.get("/api/will/admin-wills", headers=ADMIN_AUTH)
    matching = [c for c in res.json()["clients"] if c["willId"] == will_id]
    assert len(matching) == 1
    assert matching[0]["status"] == "Completed"


def test_admin_complete_rejects_unknown_will_id(client):
    res = client.post(complete_admin_url("does-not-exist"), headers=ADMIN_AUTH, json={})
    assert res.status_code == 404
    assert res.json() == {"error": constants.WILL_NOT_FOUND}


def test_admin_complete_rejects_missing_auth_token(client, fake_db):
    will_id = save_will(client, status="PendingReview")
    res = client.post(complete_admin_url(will_id), json={})
    assert res.status_code == 401


def test_admin_complete_returns_500_when_mongodb_uri_missing():
    app.dependency_overrides[get_settings] = lambda: Settings(mongodb_uri=None, jwt_secret_key="test-secret-key")
    try:
        from fastapi.testclient import TestClient
        res = TestClient(app).post(complete_admin_url("some-id"), headers=ADMIN_AUTH, json={})
        assert res.status_code == 500
        assert res.json() == {"error": constants.MONGODB_NOT_CONFIGURED}
    finally:
        app.dependency_overrides.clear()


def test_admin_complete_stores_reviewer_email_from_authenticated_admin(client, fake_db):
    will_id = save_will(client, status="PendingReview")

    client.post(complete_admin_url(will_id), headers=auth_admin("reviewer@example.com"), json={})

    doc = fake_db["will"].find_one({"willId": will_id})
    assert doc["reviewerEmail"] == "reviewer@example.com"


def test_admin_complete_ignores_client_supplied_reviewer_email(client, fake_db):
    will_id = save_will(client, status="PendingReview")

    client.post(complete_admin_url(will_id), headers=auth_admin("reviewer@example.com"), json={"reviewerEmail": "spoofed@example.com"})

    doc = fake_db["will"].find_one({"willId": will_id})
    assert doc["reviewerEmail"] == "reviewer@example.com"


def test_admin_complete_notifies_testator_email(client, monkeypatch):
    calls = []
    monkeypatch.setattr(
        admin_service.email, "send_email", lambda settings, to, subject, html: calls.append((to, subject, html)),
    )
    will_id = save_will(client, status="PendingReview", email="jane@example.com")
    calls.clear()

    client.post(complete_admin_url(will_id), headers=ADMIN_AUTH, json={})

    assert len(calls) == 1
    to, subject, html = calls[0]
    assert to == "jane@example.com"
    assert subject == constants.REVIEW_COMPLETED_SUBJECT


# --- POST /api/will/admin/save ---

def test_admin_save_creates_will_as_completed_directly(client, fake_db):
    res = client.post(ADMIN_SAVE_URL, headers=ADMIN_AUTH, json={
        "will": {"testator": {"fullName": "New Client"}},
        "testatorEmail": "client@example.com",
        "status": "Completed",
    })

    assert res.status_code == 201
    body = res.json()
    assert body["status"] == "Completed"
    doc = fake_db["will"].find_one({"willId": body["willId"]})
    assert doc["status"] == "Completed"
    assert doc["reviewerEmail"] == ADMIN_EMAIL
    # Directly-completed admin saves never go through the review inbox.
    assert fake_db["adminwill"].find_one({"willId": body["willId"]}) is None


def test_admin_save_sets_created_by_to_authenticated_admin_email_on_creation(client, fake_db):
    res = client.post(ADMIN_SAVE_URL, headers=ADMIN_AUTH, json={
        "will": {"testator": {"fullName": "New Client"}},
        "testatorEmail": "client@example.com",
        "status": "Completed",
    })
    doc = fake_db["will"].find_one({"willId": res.json()["willId"]})
    assert doc["createdBy"] == ADMIN_EMAIL


def test_admin_save_preserves_created_by_across_updates(client, fake_db):
    first = client.post(ADMIN_SAVE_URL, headers=ADMIN_AUTH, json={
        "will": {"testator": {"fullName": "New Client"}},
        "testatorEmail": "client@example.com",
        "status": "PendingReview",
    })
    will_id = first.json()["willId"]

    client.post(ADMIN_SAVE_URL, headers=auth_admin("someone-else@example.com"), json={
        "will": {"testator": {"fullName": "New Client"}},
        "testatorEmail": "client@example.com",
        "status": "PendingReview",
        "willId": will_id,
    })

    doc = fake_db["will"].find_one({"willId": will_id})
    assert doc["createdBy"] == ADMIN_EMAIL


def test_admin_save_still_allows_pending_review_status(client):
    res = client.post(ADMIN_SAVE_URL, headers=ADMIN_AUTH, json={
        "will": {}, "testatorEmail": "client@example.com", "status": "PendingReview",
    })
    assert res.status_code == 201


def test_admin_save_rejects_invalid_status(client):
    res = client.post(ADMIN_SAVE_URL, headers=ADMIN_AUTH, json={
        "will": {}, "testatorEmail": "client@example.com", "status": "Bogus",
    })
    assert res.status_code == 400
    assert res.json() == {"error": constants.BAD_WILL_STATUS}


def test_admin_save_rejects_missing_auth_token(client):
    res = client.post(ADMIN_SAVE_URL, json={
        "will": {}, "testatorEmail": "client@example.com", "status": "PendingReview",
    })
    assert res.status_code == 401


# --- POST /api/will/admin/{will_id}/send-back ---

def test_send_back_reverts_status_to_draft_and_stores_comments(client, fake_db):
    will_id = save_will(client, status="PendingReview")

    res = client.post(send_back_admin_url(will_id), headers=ADMIN_AUTH, json={"comments": "Please fix the executor section."})

    assert res.status_code == 200
    assert res.json() == {"willId": will_id, "status": "Draft"}
    doc = fake_db["will"].find_one({"willId": will_id})
    assert doc["status"] == "Draft"
    assert doc["adminComments"] == "Please fix the executor section."


def test_send_back_creates_adminwill_entry_with_comments(client, fake_db):
    will_id = save_will(client, status="PendingReview")

    res = client.post(send_back_admin_url(will_id), headers=ADMIN_AUTH, json={"comments": "Please fix the executor section."})

    assert res.status_code == 200
    entry = fake_db["adminwill"].find_one({"willId": will_id, "comments": "Please fix the executor section."})
    assert entry is not None
    assert "sentBackAt" in entry


def test_send_back_notifies_testator_email(client, monkeypatch):
    calls = []
    monkeypatch.setattr(
        admin_service.email, "send_email", lambda settings, to, subject, html: calls.append((to, subject, html)),
    )
    will_id = save_will(client, status="PendingReview", email="jane@example.com")
    calls.clear()

    client.post(send_back_admin_url(will_id), headers=ADMIN_AUTH, json={"comments": "Please fix the executor section."})

    assert len(calls) == 1
    to, subject, html = calls[0]
    assert to == "jane@example.com"
    assert subject == constants.SENT_BACK_SUBJECT
    assert "Please fix the executor section." in html


def test_send_back_requires_comments(client, fake_db):
    will_id = save_will(client, status="PendingReview")

    res = client.post(send_back_admin_url(will_id), headers=ADMIN_AUTH, json={"comments": "   "})

    assert res.status_code == 400
    assert res.json() == {"error": constants.COMMENTS_REQUIRED}


def test_send_back_rejects_unknown_will_id(client):
    res = client.post(send_back_admin_url("does-not-exist"), headers=ADMIN_AUTH, json={"comments": "Fix this"})
    assert res.status_code == 404
    assert res.json() == {"error": constants.WILL_NOT_FOUND}


def test_send_back_rejects_missing_auth_token(client, fake_db):
    will_id = save_will(client, status="PendingReview")
    res = client.post(send_back_admin_url(will_id), json={"comments": "Fix this"})
    assert res.status_code == 401
