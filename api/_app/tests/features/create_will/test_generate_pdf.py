import jwt

from _app.shared import constants
from _app.shared.constants import JWT_ALGORITHM, ROLE_TESTATOR

SAVE_URL = "/api/will/save"

VALID_ALL_INDIA_WILL = {
    "testator": {"fullName": "Jane Doe", "maritalStatus": "unmarried", "sonNames": [], "daughterNames": []},
    "executor": {"wantsExecutor": False},
    "guardian": {"hasMinors": False},
    "allIndiaAssets": {
        "houseFlat": [], "landPlot": [], "commercialProperty": [], "vehicle": [],
        "jewellery": [], "socialMediaDigital": [], "intellectualProperty": [],
    },
    "allIndiaResidue": [],
    "witnesses": [{"name": "Wit One", "aadhaarNumber": ""}],
}


def pdf_url(will_id: str) -> str:
    return f"/api/will/{will_id}/pdf"


def auth_headers(email="jane@example.com"):
    token = jwt.encode({"sub": email, "role": ROLE_TESTATOR}, "test-secret-key", algorithm=JWT_ALGORITHM)
    return {"Authorization": f"Bearer {token}"}


AUTH = auth_headers()
OTHER_AUTH = auth_headers("someone-else@example.com")


def _save_all_india_will(client, will=None):
    res = client.post(SAVE_URL, headers=AUTH, json={
        "will": will or VALID_ALL_INDIA_WILL,
        "testatorEmail": "jane@example.com",
        "status": "Draft",
        "willType": "allindia",
    })
    return res.json()["willId"]


# --- positive scenarios ---

def test_generates_pdf_for_a_valid_all_india_will(client, fake_db):
    will_id = _save_all_india_will(client)

    res = client.post(pdf_url(will_id), headers=AUTH, json={"idFields": {}})

    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert res.content.startswith(b"%PDF")
    assert len(res.content) > 0


def test_merges_id_fields_sent_by_the_client(client, fake_db):
    # ReportLab compresses page content streams, so the PAN/Aadhaar text
    # isn't found verbatim in the raw response bytes (pdf_merge.py's own
    # unit tests already cover the merge logic itself) — this asserts the
    # merged idFields actually reach PDF generation by checking the output
    # differs from the no-idFields case, i.e. the merge changed something.
    will_id = _save_all_india_will(client)

    without_ids = client.post(pdf_url(will_id), headers=AUTH, json={"idFields": {}})
    with_ids = client.post(pdf_url(will_id), headers=AUTH, json={
        "idFields": {"testator": {"pan": "ABCDE1234F", "aadhaarNumber": "111122223333"}},
    })

    assert without_ids.status_code == 200
    assert with_ids.status_code == 200
    assert with_ids.content != without_ids.content


def test_missing_id_fields_body_defaults_to_empty(client, fake_db):
    will_id = _save_all_india_will(client)
    res = client.post(pdf_url(will_id), headers=AUTH, json={})
    assert res.status_code == 200


# --- negative scenarios ---

def test_rejects_unknown_will_id(client):
    res = client.post(pdf_url("does-not-exist"), headers=AUTH, json={"idFields": {}})
    assert res.status_code == 404
    assert res.json() == {"error": constants.WILL_NOT_FOUND}


def test_rejects_wrong_owner_email(client, fake_db):
    will_id = _save_all_india_will(client)
    res = client.post(pdf_url(will_id), headers=OTHER_AUTH, json={"idFields": {}})
    assert res.status_code == 403
    assert res.json() == {"error": constants.WILL_ACCESS_DENIED}


def test_rejects_non_all_india_will_type(client, fake_db):
    res = client.post(SAVE_URL, headers=AUTH, json={
        "will": {"testator": {"fullName": "Jane Doe"}},
        "testatorEmail": "jane@example.com",
        "status": "Draft",
        "willType": "goan",
    })
    will_id = res.json()["willId"]

    res = client.post(pdf_url(will_id), headers=AUTH, json={"idFields": {}})

    assert res.status_code == 400
    assert res.json() == {"error": constants.PDF_UNSUPPORTED_WILL_TYPE}


def test_rejects_mismatched_id_fields_array_length(client, fake_db):
    will = {**VALID_ALL_INDIA_WILL, "witnesses": [{"name": "Wit One", "aadhaarNumber": ""}, {"name": "Wit Two", "aadhaarNumber": ""}]}
    will_id = _save_all_india_will(client, will)

    res = client.post(pdf_url(will_id), headers=AUTH, json={
        "idFields": {"witnesses": [{"aadhaarNumber": "111122223333"}]},
    })

    assert res.status_code == 400
    assert res.json() == {"error": constants.ID_FIELDS_LENGTH_MISMATCH}


def test_rejects_missing_auth_token(client):
    res = client.post(pdf_url("some-id"), json={"idFields": {}})
    assert res.status_code == 401
