from app.core.config import Settings, get_settings
from app.main import app
from app.shared import messages

URL = "/api/will/assign-lawyer"


def seed_accounts(fake_db):
    fake_db["login"].insert_one({"fullName": "Jane Doe", "email": "jane@lawfirm.com", "role": "lawyer", "passwordHash": "x"})
    fake_db["login"].insert_one({"fullName": "Some Client", "email": "client@example.com", "role": "client", "passwordHash": "x"})


# --- positive scenarios ---

def test_assign_lawyer_success(client, fake_db):
    seed_accounts(fake_db)
    res = client.post(URL, json={"willId": "will-123", "lawyerEmail": "jane@lawfirm.com"})
    assert res.status_code == 201
    assert res.json() == {"willId": "will-123", "lawyerEmail": "jane@lawfirm.com"}

    doc = fake_db["lawyerwill"].find_one({"willId": "will-123"})
    assert doc["lawyerEmail"] == "jane@lawfirm.com"
    assert "assignedAt" in doc


def test_assign_lawyer_is_case_insensitive_on_email(client, fake_db):
    seed_accounts(fake_db)
    res = client.post(URL, json={"willId": "will-123", "lawyerEmail": "JANE@LawFirm.com"})
    assert res.status_code == 201
    assert res.json()["lawyerEmail"] == "jane@lawfirm.com"


def test_assign_lawyer_allows_multiple_lawyers_per_will(client, fake_db):
    seed_accounts(fake_db)
    fake_db["login"].insert_one({"fullName": "John Smith", "email": "john@lawfirm.com", "role": "lawyer", "passwordHash": "x"})
    client.post(URL, json={"willId": "will-123", "lawyerEmail": "jane@lawfirm.com"})
    res = client.post(URL, json={"willId": "will-123", "lawyerEmail": "john@lawfirm.com"})
    assert res.status_code == 201
    assert fake_db["lawyerwill"].count_documents({"willId": "will-123"}) == 2


# --- negative scenarios ---

def test_assign_lawyer_rejects_missing_will_id(client):
    res = client.post(URL, json={"lawyerEmail": "jane@lawfirm.com"})
    assert res.status_code == 400
    assert res.json() == {"error": messages.WILL_ID_REQUIRED}


def test_assign_lawyer_rejects_invalid_email_format(client):
    res = client.post(URL, json={"willId": "will-123", "lawyerEmail": "not-an-email"})
    assert res.status_code == 400
    assert res.json() == {"error": messages.INVALID_LAWYER_EMAIL}


def test_assign_lawyer_rejects_unknown_email(client, fake_db):
    seed_accounts(fake_db)
    res = client.post(URL, json={"willId": "will-123", "lawyerEmail": "nobody@lawfirm.com"})
    assert res.status_code == 404
    assert res.json() == {"error": messages.LAWYER_NOT_FOUND}


def test_assign_lawyer_rejects_non_lawyer_role(client, fake_db):
    seed_accounts(fake_db)
    res = client.post(URL, json={"willId": "will-123", "lawyerEmail": "client@example.com"})
    assert res.status_code == 404
    assert res.json() == {"error": messages.LAWYER_NOT_FOUND}


def test_assign_lawyer_returns_500_when_mongodb_uri_missing():
    app.dependency_overrides[get_settings] = lambda: Settings(mongodb_uri=None)
    try:
        from fastapi.testclient import TestClient
        res = TestClient(app).post(URL, json={"willId": "will-123", "lawyerEmail": "jane@lawfirm.com"})
        assert res.status_code == 500
        assert res.json() == {"error": messages.MONGODB_NOT_CONFIGURED}
    finally:
        app.dependency_overrides.clear()
