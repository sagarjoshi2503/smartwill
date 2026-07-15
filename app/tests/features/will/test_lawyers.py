from app.core.config import Settings, get_settings
from app.main import app
from app.shared import messages

URL = "/api/will/lawyers"


# --- positive scenarios ---

def test_lawyers_returns_only_lawyer_role_accounts(client, fake_db):
    fake_db["login"].insert_one({"fullName": "Jane Doe", "email": "jane@lawfirm.com", "role": "lawyer", "passwordHash": "x"})
    fake_db["login"].insert_one({"fullName": "John Smith", "email": "john@lawfirm.com", "role": "lawyer", "passwordHash": "x"})
    fake_db["login"].insert_one({"fullName": "Some Client", "email": "client@example.com", "role": "client", "passwordHash": "x"})

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


def test_lawyers_does_not_leak_password_hash_or_id(client, fake_db):
    fake_db["login"].insert_one({"fullName": "Jane Doe", "email": "jane@lawfirm.com", "role": "lawyer", "passwordHash": "secret-hash"})
    res = client.get(URL)
    lawyer = res.json()["lawyers"][0]
    assert set(lawyer.keys()) == {"name", "email"}


# --- negative scenarios ---

def test_lawyers_returns_500_when_mongodb_uri_missing():
    app.dependency_overrides[get_settings] = lambda: Settings(mongodb_uri=None)
    try:
        from fastapi.testclient import TestClient
        res = TestClient(app).get(URL)
        assert res.status_code == 500
        assert res.json() == {"error": messages.MONGODB_NOT_CONFIGURED}
    finally:
        app.dependency_overrides.clear()
