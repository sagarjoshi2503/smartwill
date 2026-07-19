import uuid
from datetime import datetime, timezone

from pymongo.database import Database

from _app.core.config import Settings
from _app.core.exceptions import AppError
from _app.features.admin_dashboard import repository
from _app.shared import email
from _app.shared.constants import (
    COMMENTS_REQUIRED, DEFAULT_GREETING, FLD_ADMIN_COMMENTS, FLD_COMMENTS, FLD_CREATED_AT, FLD_EXECUTOR,
    FLD_FULL_NAME, FLD_GUARDIAN, FLD_ID_NUMBER, FLD_JOINT_ID, FLD_RESIDUAL_ID,
    FLD_REVIEWER_EMAIL, FLD_STATUS, FLD_SUB_ID, FLD_TESTATOR, FLD_TESTATOR_EMAIL, FLD_UPDATED_AT,
    FLD_WILL, FLD_WILL_ID, HTTP_BAD_REQUEST, HTTP_NOT_FOUND, BAD_TESTATOR_EMAIL, BAD_WILL_STATUS,
    STATUS_COMPLETED, STATUS_DRAFT, STATUS_PENDING_REVIEW, UNKNOWN_NAME, WILL_REQUIRED, WILL_NOT_FOUND,
    REVIEW_COMPLETED_SUBJECT, SENT_BACK_SUBJECT, SUBMIT_SUBJECT_TMPL,
)
from _app.shared.validators import is_valid_email, normalize_email

ALLOWED_STATUSES = {STATUS_DRAFT, STATUS_PENDING_REVIEW, STATUS_COMPLETED}


def _redact_id_numbers(will_data: dict) -> dict:
    """ID numbers (Aadhaar/PAN/etc.) are sensitive and only needed transiently
    in the browser to render the generated Will document — they must never be
    persisted to the database."""
    if not isinstance(will_data, dict):
        return will_data

    redacted = dict(will_data)
    if isinstance(redacted.get(FLD_TESTATOR), dict):
        redacted[FLD_TESTATOR] = {**redacted[FLD_TESTATOR], FLD_ID_NUMBER: ""}
    if isinstance(redacted.get(FLD_EXECUTOR), dict):
        redacted[FLD_EXECUTOR] = {
            **redacted[FLD_EXECUTOR], FLD_ID_NUMBER: "", FLD_JOINT_ID: "", FLD_SUB_ID: "",
        }
    if isinstance(redacted.get(FLD_GUARDIAN), dict):
        redacted[FLD_GUARDIAN] = {**redacted[FLD_GUARDIAN], FLD_ID_NUMBER: "", FLD_SUB_ID: ""}
    if FLD_RESIDUAL_ID in redacted:
        redacted[FLD_RESIDUAL_ID] = ""
    return redacted


def save_will_as_admin(db: Database, body: dict, settings: Settings) -> dict:
    # Admin-driven saves (e.g. save-and-complete for a client) bypass the
    # ownership/lock checks that apply to testator-driven saves — an admin
    # can create or update any Will regardless of who submitted it.
    if not isinstance(body, dict) or not body:
        raise AppError(HTTP_BAD_REQUEST, WILL_REQUIRED)

    status = body.get(FLD_STATUS) or STATUS_PENDING_REVIEW
    if status not in ALLOWED_STATUSES:
        raise AppError(HTTP_BAD_REQUEST, BAD_WILL_STATUS)

    testator_email = normalize_email(body.get(FLD_TESTATOR_EMAIL))
    if not is_valid_email(testator_email):
        raise AppError(HTTP_BAD_REQUEST, BAD_TESTATOR_EMAIL)

    now = datetime.now(timezone.utc)
    will_id = (body.get(FLD_WILL_ID) or "").strip()

    if will_id:
        existing = repository.find_will_by_id(db, will_id)
        if not existing:
            raise AppError(HTTP_NOT_FOUND, WILL_NOT_FOUND)
        created_at = existing.get(FLD_CREATED_AT, now)
    else:
        will_id = str(uuid.uuid4())
        created_at = now

    document = {
        **body,
        FLD_WILL: _redact_id_numbers(body.get(FLD_WILL) or {}),
        FLD_WILL_ID: will_id,
        FLD_TESTATOR_EMAIL: testator_email,
        FLD_STATUS: status,
        FLD_CREATED_AT: created_at,
        FLD_UPDATED_AT: now,
    }
    if status == STATUS_COMPLETED:
        reviewer_email = normalize_email(body.get(FLD_REVIEWER_EMAIL)) if body.get(FLD_REVIEWER_EMAIL) else None
        if reviewer_email:
            document[FLD_REVIEWER_EMAIL] = reviewer_email
    repository.upsert_will(db, will_id, document)

    if status == STATUS_PENDING_REVIEW:
        _submit_for_admin_review(db, settings, document)

    return {FLD_WILL_ID: will_id, FLD_STATUS: status}


def _submit_for_admin_review(db: Database, settings: Settings, document: dict) -> None:
    repository.insert_admin_will(db, {
        FLD_WILL_ID: document[FLD_WILL_ID],
        "adminEmail": settings.admin_review_email,
        "assignedAt": datetime.now(timezone.utc),
    })

    testator = (document.get(FLD_WILL) or {}).get(FLD_TESTATOR) or {}
    testator_name = testator.get(FLD_FULL_NAME) or UNKNOWN_NAME
    testator_email = document.get(FLD_TESTATOR_EMAIL) or UNKNOWN_NAME
    email.send_email(
        settings,
        to=settings.admin_review_email,
        subject=SUBMIT_SUBJECT_TMPL.format(testator_name=testator_name),
        html=(
            f"<p>A new Will has been submitted for review.</p>"
            f"<ul>"
            f"<li><strong>Testator:</strong> {testator_name}</li>"
            f"<li><strong>Testator email:</strong> {testator_email}</li>"
            f"<li><strong>Will ID:</strong> {document[FLD_WILL_ID]}</li>"
            f"</ul>"
        ),
    )


def list_admin_wills(db: Database) -> dict:
    clients = []
    for w in repository.find_all_wills(db):
        testator = (w.get(FLD_WILL) or {}).get(FLD_TESTATOR) or {}
        updated_at = w.get(FLD_UPDATED_AT)
        clients.append({
            FLD_WILL_ID: w.get(FLD_WILL_ID),
            "name": testator.get(FLD_FULL_NAME) or "",
            "contact": w.get(FLD_TESTATOR_EMAIL) or "",
            FLD_UPDATED_AT: updated_at.isoformat() if updated_at else None,
            FLD_STATUS: w.get(FLD_STATUS) or STATUS_DRAFT,
        })

    clients.sort(key=lambda c: c["updatedAt"] or "", reverse=True)
    return {"clients": clients}


def get_will_as_admin(db: Database, will_id: str) -> dict:
    # No ownership check — the admin reviewer can open any submitted Will.
    document = repository.find_will_by_id(db, will_id)
    if not document:
        raise AppError(HTTP_NOT_FOUND, WILL_NOT_FOUND)

    return {
        FLD_WILL_ID: document[FLD_WILL_ID],
        FLD_WILL: document.get(FLD_WILL) or {},
        FLD_TESTATOR_EMAIL: document.get(FLD_TESTATOR_EMAIL) or "",
        FLD_STATUS: document.get(FLD_STATUS) or STATUS_DRAFT,
        FLD_ADMIN_COMMENTS: document.get(FLD_ADMIN_COMMENTS),
    }


def admin_complete_will(db: Database, will_id: str, body: dict, settings: Settings) -> dict:
    document = repository.find_will_by_id(db, will_id)
    if not document:
        raise AppError(HTTP_NOT_FOUND, WILL_NOT_FOUND)

    updated_will = body.get(FLD_WILL) if isinstance(body, dict) else None
    reviewer_email = None
    if isinstance(body, dict) and body.get(FLD_REVIEWER_EMAIL):
        reviewer_email = normalize_email(body.get(FLD_REVIEWER_EMAIL))
    document = {
        **document,
        **({FLD_WILL: _redact_id_numbers(updated_will)} if updated_will is not None else {}),
        FLD_STATUS: STATUS_COMPLETED,
        FLD_UPDATED_AT: datetime.now(timezone.utc),
        **({FLD_REVIEWER_EMAIL: reviewer_email} if reviewer_email else {}),
    }
    repository.upsert_will(db, will_id, document)

    testator_email = document.get(FLD_TESTATOR_EMAIL)
    testator_name = (
        (document.get(FLD_WILL) or {}).get(FLD_TESTATOR, {}).get(FLD_FULL_NAME) or DEFAULT_GREETING
    )
    if testator_email:
        email.send_email(
            settings,
            to=testator_email,
            subject=REVIEW_COMPLETED_SUBJECT,
            html=(
                f"<p>Hi {testator_name},</p>"
                f"<p>Your Will has been reviewed and is now complete.</p>"
            ),
        )

    return {FLD_WILL_ID: will_id, FLD_STATUS: STATUS_COMPLETED}


def admin_send_back_will(db: Database, will_id: str, comments: str, settings: Settings) -> dict:
    comments = (comments or "").strip()
    if not comments:
        raise AppError(HTTP_BAD_REQUEST, COMMENTS_REQUIRED)

    document = repository.find_will_by_id(db, will_id)
    if not document:
        raise AppError(HTTP_NOT_FOUND, WILL_NOT_FOUND)

    document = {
        **document,
        FLD_STATUS: STATUS_DRAFT,
        FLD_ADMIN_COMMENTS: comments,
        FLD_UPDATED_AT: datetime.now(timezone.utc),
    }
    repository.upsert_will(db, will_id, document)
    repository.insert_admin_will(db, {
        FLD_WILL_ID: will_id,
        FLD_COMMENTS: comments,
        "sentBackAt": datetime.now(timezone.utc),
    })

    testator_email = document.get(FLD_TESTATOR_EMAIL)
    testator_name = (
        (document.get(FLD_WILL) or {}).get(FLD_TESTATOR, {}).get(FLD_FULL_NAME) or DEFAULT_GREETING
    )
    if testator_email:
        email.send_email(
            settings,
            to=testator_email,
            subject=SENT_BACK_SUBJECT,
            html=(
                f"<p>Hi {testator_name},</p>"
                f"<p>Your Will submission has been reviewed and needs some changes before it can be completed:</p>"
                f"<p>{comments}</p>"
                f"<p>Please log back in to update and resubmit your Will.</p>"
            ),
        )

    return {FLD_WILL_ID: will_id, FLD_STATUS: STATUS_DRAFT}


def delete_will_as_admin(db: Database, will_id: str) -> dict:
    # No ownership check — the admin reviewer can delete any submitted Will,
    # unlike the testator-scoped delete in the create_will module.
    document = repository.find_will_by_id(db, will_id)
    if not document:
        raise AppError(HTTP_NOT_FOUND, WILL_NOT_FOUND)

    repository.delete_will(db, will_id)
    return {FLD_WILL_ID: will_id}
