from _app.core.config import Settings
from _app.core.exceptions import AppError
from _app.shared import email
from _app.shared.constants import (
    CONTACT_EMAIL_INVALID, CONTACT_MESSAGE_REQUIRED, CONTACT_NAME_REQUIRED, CONTACT_SUBJECT_REQUIRED,
    CONTACT_SUBJECT_TMPL, FLD_EMAIL, FLD_MESSAGE, FLD_NAME, FLD_SUBJECT, HTTP_BAD_REQUEST,
)
from _app.shared.validators import is_valid_email, normalize_email


def get_contact_info(settings: Settings) -> dict:
    return {FLD_EMAIL: settings.admin_review_email, "phone": settings.twilio_from_number}


def send_contact_message(body: dict, settings: Settings) -> dict:
    if not isinstance(body, dict):
        body = {}

    name = (body.get(FLD_NAME) or "").strip()
    sender_email = normalize_email(body.get(FLD_EMAIL))
    subject = (body.get(FLD_SUBJECT) or "").strip()
    message = (body.get(FLD_MESSAGE) or "").strip()

    if not name:
        raise AppError(HTTP_BAD_REQUEST, CONTACT_NAME_REQUIRED)
    if not is_valid_email(sender_email):
        raise AppError(HTTP_BAD_REQUEST, CONTACT_EMAIL_INVALID)
    if not subject:
        raise AppError(HTTP_BAD_REQUEST, CONTACT_SUBJECT_REQUIRED)
    if not message:
        raise AppError(HTTP_BAD_REQUEST, CONTACT_MESSAGE_REQUIRED)

    email.send_email(
        settings,
        to=settings.admin_review_email,
        subject=CONTACT_SUBJECT_TMPL.format(subject=subject),
        html=(
            f"<p>New message from the Contact Us page.</p>"
            f"<ul>"
            f"<li><strong>Name:</strong> {name}</li>"
            f"<li><strong>Email:</strong> {sender_email}</li>"
            f"<li><strong>Subject:</strong> {subject}</li>"
            f"</ul>"
            f"<p>{message}</p>"
        ),
    )
    return {"sent": True}
