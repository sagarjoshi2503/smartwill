import mongomock
import pytest
from fastapi.testclient import TestClient

from conftest import import_api_module

assign_module = import_api_module("will", "assign_lawyer")

URL = "/api/will/assign-lawyer"


@pytest.fixture
def db(monkeypatch):
    monkeypatch.setattr(assign_module, "MONGODB_URI", "mongodb://fake")
    fake_db = mongomock.MongoClient().db
    fake_db["login"].insert_one({"fullName": "Jane Doe", "email": "jane@lawfirm.com", "role": "lawyer", "passwordHash": "x"})
    fake_db["login"].insert_one({"fullName": "Some Client", "email": "client@example.com", "role": "client", "passwordHash": "x"})
    monkeypatch.setattr(assign_module, "get_db", lambda: fake_db)
    return fake_db


@pytest.fixture
def client(db):
    return TestClient(assign_module.app)


# --- positive scenarios ---

def test_assign_lawyer_success(client, db):
    res = client.post(URL, json={"willId": "will-123", "lawyerEmail": "jane@lawfirm.com"})
    assert res.status_code == 201
    assert res.json() == {"willId": "will-123", "lawyerEmail": "jane@lawfirm.com"}

    doc = db["lawyerwill"].find_one({"willId": "will-123"})
    assert doc["lawyerEmail"] == "jane@lawfirm.com"
    assert "assignedAt" in doc


def test_assign_lawyer_is_case_insensitive_on_email(client, db):
    res = client.post(URL, json={"willId": "will-123", "lawyerEmail": "JANE@LawFirm.com"})
    assert res.status_code == 201
    assert res.json()["lawyerEmail"] == "jane@lawfirm.com"


def test_assign_lawyer_allows_multiple_lawyers_per_will(client, db):
    db["login"].insert_one({"fullName": "John Smith", "email": "john@lawfirm.com", "role": "lawyer", "passwordHash": "x"})
    client.post(URL, json={"willId": "will-123", "lawyerEmail": "jane@lawfirm.com"})
    res = client.post(URL, json={"willId": "will-123", "lawyerEmail": "john@lawfirm.com"})
    assert res.status_code == 201
    assert db["lawyerwill"].count_documents({"willId": "will-123"}) == 2


# --- negative scenarios ---

def test_assign_lawyer_rejects_missing_will_id(client):
    res = client.post(URL, json={"lawyerEmail": "jane@lawfirm.com"})
    assert res.status_code == 400
    assert res.json() == {"error": "willId is required."}


def test_assign_lawyer_rejects_invalid_email_format(client):
    res = client.post(URL, json={"willId": "will-123", "lawyerEmail": "not-an-email"})
    assert res.status_code == 400
    assert res.json() == {"error": "Enter a valid lawyer email address."}


def test_assign_lawyer_rejects_unknown_email(client):
    res = client.post(URL, json={"willId": "will-123", "lawyerEmail": "nobody@lawfirm.com"})
    assert res.status_code == 404
    assert res.json() == {"error": "Selected lawyer account was not found."}


def test_assign_lawyer_rejects_non_lawyer_role(client):
    res = client.post(URL, json={"willId": "will-123", "lawyerEmail": "client@example.com"})
    assert res.status_code == 404
    assert res.json() == {"error": "Selected lawyer account was not found."}


def test_assign_lawyer_returns_500_when_mongodb_uri_missing(monkeypatch):
    monkeypatch.setattr(assign_module, "MONGODB_URI", None)
    res = TestClient(assign_module.app).post(URL, json={"willId": "will-123", "lawyerEmail": "jane@lawfirm.com"})
    assert res.status_code == 500
    assert "MONGODB_URI" in res.json()["error"]
