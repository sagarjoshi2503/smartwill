import mongomock
import pytest
from fastapi.testclient import TestClient

from conftest import import_api_module

lawyers_module = import_api_module("will", "lawyers")

URL = "/api/will/lawyers"


@pytest.fixture
def collection(monkeypatch):
    monkeypatch.setattr(lawyers_module, "MONGODB_URI", "mongodb://fake")
    fake_collection = mongomock.MongoClient().db.login
    monkeypatch.setattr(lawyers_module, "get_collection", lambda: fake_collection)
    return fake_collection


@pytest.fixture
def client(collection):
    return TestClient(lawyers_module.app)


# --- positive scenarios ---

def test_lawyers_returns_only_lawyer_role_accounts(client, collection):
    collection.insert_one({"fullName": "Jane Doe", "email": "jane@lawfirm.com", "role": "lawyer", "passwordHash": "x"})
    collection.insert_one({"fullName": "John Smith", "email": "john@lawfirm.com", "role": "lawyer", "passwordHash": "x"})
    collection.insert_one({"fullName": "Some Client", "email": "client@example.com", "role": "client", "passwordHash": "x"})

    res = client.get(URL)
    assert res.status_code == 200
    lawyers = res.json()["lawyers"]
    assert {"name": "Jane Doe", "email": "jane@lawfirm.com"} in lawyers
    assert {"name": "John Smith", "email": "john@lawfirm.com"} in lawyers
    assert all(l["email"] != "client@example.com" for l in lawyers)


def test_lawyers_returns_empty_list_when_none_registered(client):
    res = client.get(URL)
    assert res.status_code == 200
    assert res.json() == {"lawyers": []}


def test_lawyers_does_not_leak_password_hash_or_id(client, collection):
    collection.insert_one({"fullName": "Jane Doe", "email": "jane@lawfirm.com", "role": "lawyer", "passwordHash": "secret-hash"})
    res = client.get(URL)
    lawyer = res.json()["lawyers"][0]
    assert set(lawyer.keys()) == {"name", "email"}


# --- negative scenarios ---

def test_lawyers_returns_500_when_mongodb_uri_missing(monkeypatch):
    monkeypatch.setattr(lawyers_module, "MONGODB_URI", None)
    res = TestClient(lawyers_module.app).get(URL)
    assert res.status_code == 500
    assert "MONGODB_URI" in res.json()["error"]
