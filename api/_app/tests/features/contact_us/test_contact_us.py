from _app.features.contact_us import service as contact_service
from _app.shared import constants

INFO_URL = "/api/contact-us/info"
SEND_URL = "/api/contact-us/send"

VALID_PAYLOAD = {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "subject": "Question about Custom Will",
    "message": "I need a bespoke Will format, can you help?",
}


# --- GET /api/contact-us/info ---

def test_get_contact_info_returns_admin_email_and_twilio_number(client, configured_settings):
    res = client.get(INFO_URL)
    assert res.status_code == 200
    assert res.json() == {"email": configured_settings.admin_review_email, "phone": configured_settings.twilio_from_number}


# --- POST /api/contact-us/send ---

def test_send_contact_message_success(client, monkeypatch, configured_settings):
    calls = []
    monkeypatch.setattr(
        contact_service.email, "send_email", lambda settings, to, subject, html: calls.append((to, subject, html)),
    )

    res = client.post(SEND_URL, json=VALID_PAYLOAD)

    assert res.status_code == 200
    assert res.json() == {"sent": True}
    assert len(calls) == 1
    to, subject, html = calls[0]
    assert to == configured_settings.admin_review_email
    assert subject == "New Contact Us message: Question about Custom Will"
    assert "Jane Doe" in html
    assert "jane@example.com" in html
    assert "I need a bespoke Will format, can you help?" in html


def test_send_contact_message_rejects_missing_name(client):
    res = client.post(SEND_URL, json={**VALID_PAYLOAD, "name": ""})
    assert res.status_code == 400
    assert res.json() == {"error": constants.CONTACT_NAME_REQUIRED}


def test_send_contact_message_rejects_invalid_email(client):
    res = client.post(SEND_URL, json={**VALID_PAYLOAD, "email": "not-an-email"})
    assert res.status_code == 400
    assert res.json() == {"error": constants.CONTACT_EMAIL_INVALID}


def test_send_contact_message_rejects_missing_subject(client):
    res = client.post(SEND_URL, json={**VALID_PAYLOAD, "subject": ""})
    assert res.status_code == 400
    assert res.json() == {"error": constants.CONTACT_SUBJECT_REQUIRED}


def test_send_contact_message_rejects_missing_message(client):
    res = client.post(SEND_URL, json={**VALID_PAYLOAD, "message": ""})
    assert res.status_code == 400
    assert res.json() == {"error": constants.CONTACT_MESSAGE_REQUIRED}
