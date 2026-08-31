URL = "/api/admin/rate-limits"


def test_get_returns_defaults_when_no_document_exists(client, admin_auth_headers):
    res = client.get(URL, headers=admin_auth_headers())

    assert res.status_code == 200
    body = res.json()
    assert body["maxThreadsPerDay"] == 100
    assert body["maxCostUsdPerDay"] == 5.0
    assert body["maxTokensPerDay"] == 50_000
    assert body["updatedAt"] is None
    assert body["updatedBy"] is None


def test_get_rejects_requests_with_no_auth_header(client):
    res = client.get(URL)
    assert res.status_code == 401


def test_get_rejects_a_testator_token(client, testator_auth_headers):
    res = client.get(URL, headers=testator_auth_headers())
    assert res.status_code == 401


def test_put_saves_and_get_reflects_the_new_values(client, admin_auth_headers):
    put_res = client.put(
        URL, headers=admin_auth_headers(),
        json={"maxThreadsPerDay": 10, "maxCostUsdPerDay": 1.5, "maxTokensPerDay": 2000},
    )
    assert put_res.status_code == 200
    body = put_res.json()
    assert body["maxThreadsPerDay"] == 10
    assert body["maxCostUsdPerDay"] == 1.5
    assert body["maxTokensPerDay"] == 2000
    assert body["updatedAt"] is not None
    assert body["updatedBy"] == "admin@lawfirm.com"

    get_res = client.get(URL, headers=admin_auth_headers())
    assert get_res.json()["maxThreadsPerDay"] == 10


def test_put_overwrites_previous_values_not_merges(client, admin_auth_headers):
    client.put(
        URL, headers=admin_auth_headers(),
        json={"maxThreadsPerDay": 10, "maxCostUsdPerDay": 1.5, "maxTokensPerDay": 2000},
    )
    res = client.put(
        URL, headers=admin_auth_headers(),
        json={"maxThreadsPerDay": 20, "maxCostUsdPerDay": 3.0, "maxTokensPerDay": 4000},
    )

    assert res.status_code == 200
    body = res.json()
    assert body["maxThreadsPerDay"] == 20
    assert body["maxCostUsdPerDay"] == 3.0
    assert body["maxTokensPerDay"] == 4000


def test_put_rejects_requests_with_no_auth_header(client):
    res = client.put(URL, json={"maxThreadsPerDay": 10, "maxCostUsdPerDay": 1.5, "maxTokensPerDay": 2000})
    assert res.status_code == 401


def test_put_rejects_a_testator_token(client, testator_auth_headers):
    res = client.put(
        URL, headers=testator_auth_headers(),
        json={"maxThreadsPerDay": 10, "maxCostUsdPerDay": 1.5, "maxTokensPerDay": 2000},
    )
    assert res.status_code == 401


def test_put_rejects_a_non_positive_thread_count(client, admin_auth_headers):
    res = client.put(
        URL, headers=admin_auth_headers(),
        json={"maxThreadsPerDay": 0, "maxCostUsdPerDay": 1.5, "maxTokensPerDay": 2000},
    )
    assert res.status_code == 400


def test_put_rejects_a_negative_cost(client, admin_auth_headers):
    res = client.put(
        URL, headers=admin_auth_headers(),
        json={"maxThreadsPerDay": 10, "maxCostUsdPerDay": -1, "maxTokensPerDay": 2000},
    )
    assert res.status_code == 400


def test_put_rejects_a_non_positive_token_count(client, admin_auth_headers):
    res = client.put(
        URL, headers=admin_auth_headers(),
        json={"maxThreadsPerDay": 10, "maxCostUsdPerDay": 1.5, "maxTokensPerDay": 0},
    )
    assert res.status_code == 400


def test_put_rejects_a_non_integer_thread_count(client, admin_auth_headers):
    res = client.put(
        URL, headers=admin_auth_headers(),
        json={"maxThreadsPerDay": 10.5, "maxCostUsdPerDay": 1.5, "maxTokensPerDay": 2000},
    )
    assert res.status_code == 400


def test_put_accepts_an_integer_cost(client, admin_auth_headers):
    # maxCostUsdPerDay is a float field but a whole-number JSON value (5,
    # not 5.0) must still be accepted.
    res = client.put(
        URL, headers=admin_auth_headers(),
        json={"maxThreadsPerDay": 10, "maxCostUsdPerDay": 5, "maxTokensPerDay": 2000},
    )
    assert res.status_code == 200
    assert res.json()["maxCostUsdPerDay"] == 5.0


def test_put_rejects_missing_fields(client, admin_auth_headers):
    res = client.put(URL, headers=admin_auth_headers(), json={"maxThreadsPerDay": 10})
    assert res.status_code == 400
