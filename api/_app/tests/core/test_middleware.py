def test_responses_include_hardening_headers(client):
    res = client.get("/healthz")
    assert res.headers["x-content-type-options"] == "nosniff"
    assert res.headers["x-frame-options"] == "DENY"
    assert res.headers["referrer-policy"] == "no-referrer"


def test_hardening_headers_present_even_on_error_responses(client):
    res = client.get("/api/this-route-does-not-exist")
    assert res.status_code == 404
    assert res.headers["x-content-type-options"] == "nosniff"
    assert res.headers["x-frame-options"] == "DENY"
