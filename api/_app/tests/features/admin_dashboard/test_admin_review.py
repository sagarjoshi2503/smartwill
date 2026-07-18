from _app.core.config import Settings, get_settings
from _app.main import app
from _app.shared import constants

SAVE_URL = "/api/will/save"


def get_admin_url(will_id: str) -> str:
    return f"/api/will/admin/{will_id}"


def complete_admin_url(will_id: str) -> str:
    return f"/api/will/admin/{will_id}/complete"


def send_back_admin_url(will_id: str) -> str:
    return f"/api/will/admin/{will_id}/send-back"


ADMIN_SAVE_URL = "/api/will/admin/save"


def save_will(client, status="PendingReview", email="jane@example.com", full_name="Jane Doe"):
    res = client.post(SAVE_URL, json={
        "will": {"testator": {"fullName": full_name}},
        "testatorEmail": email,
        "status": status,
    })
    return res.json()["willId"]


# --- GET /api/will/admin/{will_id} ---

def test_admin_get_returns_the_will_regardless_of_owner(client, fake_db):
    will_id = save_will(client, status="PendingReview")

    res = client.get(get_admin_url(will_id))

    assert res.status_code == 200
    body = res.json()
    assert body["willId"] == will_id
    assert body["status"] == "PendingReview"
    assert body["will"]["testator"]["fullName"] == "Jane Doe"


def test_admin_get_rejects_unknown_will_id(client):
    res = client.get(get_admin_url("does-not-exist"))
    assert res.status_code == 404
    assert res.json() == {"error": constants.WILL_NOT_FOUND}


# --- POST /api/will/admin/{will_id}/complete ---

def test_admin_complete_marks_status_completed(client, fake_db):
    will_id = save_will(client, status="PendingReview")

    res = client.post(complete_admin_url(will_id), json={})

    assert res.status_code == 200
    assert res.json() == {"willId": will_id, "status": "Completed"}
    doc = fake_db["will"].find_one({"willId": will_id})
    assert doc["status"] == "Completed"


def test_admin_complete_saves_edited_will_content(client, fake_db):
    will_id = save_will(client, status="PendingReview", full_name="Jane Doe")

    res = client.post(complete_admin_url(will_id), json={
        "will": {"testator": {"fullName": "Jane Doe Edited"}},
    })

    assert res.status_code == 200
    doc = fake_db["will"].find_one({"willId": will_id})
    assert doc["will"]["testator"]["fullName"] == "Jane Doe Edited"


def test_admin_complete_strips_id_numbers_from_edited_will(client, fake_db):
    will_id = save_will(client, status="PendingReview", full_name="Jane Doe")

    res = client.post(complete_admin_url(will_id), json={
        "will": {"testator": {"fullName": "Jane Doe", "idNumber": "AAAAA1111A"}},
    })

    assert res.status_code == 200
    doc = fake_db["will"].find_one({"willId": will_id})
    assert doc["will"]["testator"]["idNumber"] == ""


def test_admin_complete_preserves_will_content_when_not_provided(client, fake_db):
    will_id = save_will(client, status="PendingReview", full_name="Jane Doe")

    client.post(complete_admin_url(will_id), json={})

    doc = fake_db["will"].find_one({"willId": will_id})
    assert doc["will"]["testator"]["fullName"] == "Jane Doe"


def test_admin_complete_updates_status_in_will_tracker_list(client, fake_db):
    will_id = save_will(client, status="PendingReview")

    client.post(complete_admin_url(will_id), json={})

    res = client.get("/api/will/admin-wills")
    matching = [c for c in res.json()["clients"] if c["willId"] == will_id]
    assert len(matching) == 1
    assert matching[0]["status"] == "Completed"


def test_admin_complete_rejects_unknown_will_id(client):
    res = client.post(complete_admin_url("does-not-exist"), json={})
    assert res.status_code == 404
    assert res.json() == {"error": constants.WILL_NOT_FOUND}


def test_admin_complete_returns_500_when_mongodb_uri_missing():
    app.dependency_overrides[get_settings] = lambda: Settings(mongodb_uri=None)
    try:
        from fastapi.testclient import TestClient
        res = TestClient(app).post(complete_admin_url("some-id"), json={})
        assert res.status_code == 500
        assert res.json() == {"error": constants.MONGODB_NOT_CONFIGURED}
    finally:
        app.dependency_overrides.clear()


def test_admin_complete_stores_reviewer_email(client, fake_db):
    will_id = save_will(client, status="PendingReview")

    client.post(complete_admin_url(will_id), json={"reviewerEmail": "Reviewer@Example.com"})

    doc = fake_db["will"].find_one({"willId": will_id})
    assert doc["reviewerEmail"] == "reviewer@example.com"


# --- POST /api/will/admin/save ---

def test_admin_save_creates_will_as_completed_directly(client, fake_db):
    res = client.post(ADMIN_SAVE_URL, json={
        "will": {"testator": {"fullName": "New Client"}},
        "testatorEmail": "client@example.com",
        "status": "Completed",
        "reviewerEmail": "anup@prabhuverlekar.com",
    })

    assert res.status_code == 201
    body = res.json()
    assert body["status"] == "Completed"
    doc = fake_db["will"].find_one({"willId": body["willId"]})
    assert doc["status"] == "Completed"
    assert doc["reviewerEmail"] == "anup@prabhuverlekar.com"
    # Directly-completed admin saves never go through the review inbox.
    assert fake_db["adminwill"].find_one({"willId": body["willId"]}) is None


def test_admin_save_still_allows_pending_review_status(client):
    res = client.post(ADMIN_SAVE_URL, json={
        "will": {}, "testatorEmail": "client@example.com", "status": "PendingReview",
    })
    assert res.status_code == 201


def test_admin_save_rejects_invalid_status(client):
    res = client.post(ADMIN_SAVE_URL, json={
        "will": {}, "testatorEmail": "client@example.com", "status": "Bogus",
    })
    assert res.status_code == 400
    assert res.json() == {"error": constants.BAD_WILL_STATUS}


# --- POST /api/will/admin/{will_id}/send-back ---

def test_send_back_reverts_status_to_draft_and_stores_comments(client, fake_db):
    will_id = save_will(client, status="PendingReview")

    res = client.post(send_back_admin_url(will_id), json={"comments": "Please fix the executor section."})

    assert res.status_code == 200
    assert res.json() == {"willId": will_id, "status": "Draft"}
    doc = fake_db["will"].find_one({"willId": will_id})
    assert doc["status"] == "Draft"
    assert doc["adminComments"] == "Please fix the executor section."


def test_send_back_requires_comments(client, fake_db):
    will_id = save_will(client, status="PendingReview")

    res = client.post(send_back_admin_url(will_id), json={"comments": "   "})

    assert res.status_code == 400
    assert res.json() == {"error": constants.COMMENTS_REQUIRED}


def test_send_back_rejects_unknown_will_id(client):
    res = client.post(send_back_admin_url("does-not-exist"), json={"comments": "Fix this"})
    assert res.status_code == 404
    assert res.json() == {"error": constants.WILL_NOT_FOUND}
