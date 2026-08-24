from datetime import datetime, timezone

URL = "/api/ai-usage/admin/list"


def _insert(fake_db, **overrides):
    doc = {
        "emailid": "jane@example.com",
        "threadid": "t1",
        "role": "testator",
        "modelname": "claude-opus-5",
        "inputtokens": 100,
        "outputtokens": 50,
        "requests": 2,
        "cost": 0.005,
        "createddate": datetime(2026, 1, 15, 10, 30, tzinfo=timezone.utc),
        "updateddate": datetime(2026, 1, 15, 10, 35, tzinfo=timezone.utc),
        **overrides,
    }
    fake_db["aiusages"].insert_one(doc)
    return doc


def test_admin_list_returns_all_usage_rows(client, fake_db, admin_auth_headers):
    _insert(fake_db)
    _insert(fake_db, emailid="bob@example.com", threadid="t2")

    res = client.get(URL, headers=admin_auth_headers())

    assert res.status_code == 200
    items = res.json()["aiUsage"]
    assert len(items) == 2
    assert {i["emailid"] for i in items} == {"jane@example.com", "bob@example.com"}


def test_admin_list_includes_every_field(client, fake_db, admin_auth_headers):
    _insert(fake_db)

    res = client.get(URL, headers=admin_auth_headers())

    item = res.json()["aiUsage"][0]
    assert item["emailid"] == "jane@example.com"
    assert item["threadid"] == "t1"
    assert item["role"] == "testator"
    assert item["modelname"] == "claude-opus-5"
    assert item["inputtokens"] == 100
    assert item["outputtokens"] == 50
    assert item["requests"] == 2
    assert item["cost"] == 0.005
    assert item["createddate"].startswith("2026-01-15T10:30:00")
    assert item["updateddate"].startswith("2026-01-15T10:35:00")


def test_admin_list_dates_carry_an_explicit_utc_offset(client, fake_db, admin_auth_headers):
    # mongomock (and real pymongo) return naive datetimes even though the
    # stored value is UTC — without an explicit "+00:00" suffix, a
    # frontend `new Date(...)` on this string would be misread as local
    # time instead of UTC (see service.py's _iso()).
    _insert(fake_db)

    res = client.get(URL, headers=admin_auth_headers())

    item = res.json()["aiUsage"][0]
    assert item["createddate"].endswith("+00:00")
    assert item["updateddate"].endswith("+00:00")


def test_admin_list_sorted_most_recently_updated_first(client, fake_db, admin_auth_headers):
    _insert(fake_db, emailid="older@example.com", threadid="t1", updateddate=datetime(2026, 1, 1, tzinfo=timezone.utc))
    _insert(fake_db, emailid="newer@example.com", threadid="t2", updateddate=datetime(2026, 1, 20, tzinfo=timezone.utc))

    res = client.get(URL, headers=admin_auth_headers())

    emails = [i["emailid"] for i in res.json()["aiUsage"]]
    assert emails == ["newer@example.com", "older@example.com"]


def test_admin_list_filters_by_search_across_email_thread_and_model(client, fake_db, admin_auth_headers):
    _insert(fake_db, emailid="jane@example.com", threadid="t1", modelname="claude-opus-5")
    _insert(fake_db, emailid="bob@example.com", threadid="t2", modelname="claude-sonnet-5")

    res = client.get(URL, headers=admin_auth_headers(), params={"search": "opus"})

    items = res.json()["aiUsage"]
    assert len(items) == 1
    assert items[0]["emailid"] == "jane@example.com"


def test_admin_list_empty_collection_returns_empty_list(client, admin_auth_headers):
    res = client.get(URL, headers=admin_auth_headers())

    assert res.status_code == 200
    assert res.json() == {"aiUsage": []}


def test_admin_list_requires_auth(client):
    res = client.get(URL)
    assert res.status_code == 401


def test_admin_list_rejects_testator_token(client, testator_auth_headers):
    res = client.get(URL, headers=testator_auth_headers())
    assert res.status_code == 401
