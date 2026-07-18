import uuid
from datetime import datetime, timedelta, timezone

from pymongo.database import Database

from app.core.config import Settings
from app.core.exceptions import AppError
from app.features.create_will import repository
from app.shared import email
from app.shared.constants import (
    HTTP_BAD_REQUEST, HTTP_FORBIDDEN, HTTP_NOT_FOUND, INVALID_TESTATOR_EMAIL, INVALID_WILL_STATUS, STATUS_DRAFT,
    STATUS_PENDING_REVIEW, TESTATOR_WILL_VISIBILITY_DAYS, WILL_ACCESS_DENIED, WILL_DATA_REQUIRED,
    WILL_LOCKED_FOR_REVIEW, WILL_NOT_FOUND,
)
from app.shared.validators import is_valid_email, normalize_email

ALLOWED_STATUSES = {STATUS_DRAFT, STATUS_PENDING_REVIEW}


def _redact_id_numbers(will_data: dict) -> dict:
    """ID numbers (Aadhaar/PAN/etc.) are sensitive and only needed transiently
    in the browser to render the generated Will document — they must never be
    persisted to the database."""
    if not isinstance(will_data, dict):
        return will_data

    redacted = dict(will_data)
    if isinstance(redacted.get("testator"), dict):
        redacted["testator"] = {**redacted["testator"], "idNumber": ""}
    if isinstance(redacted.get("executor"), dict):
        redacted["executor"] = {**redacted["executor"], "idNumber": "", "jointIdNumber": "", "subIdNumber": ""}
    if isinstance(redacted.get("guardian"), dict):
        redacted["guardian"] = {**redacted["guardian"], "idNumber": "", "subIdNumber": ""}
    if "residualIdNumber" in redacted:
        redacted["residualIdNumber"] = ""
    return redacted


def save_will(db: Database, body: dict, settings: Settings) -> dict:
    if not isinstance(body, dict) or not body:
        raise AppError(HTTP_BAD_REQUEST, WILL_DATA_REQUIRED)

    status = body.get("status") or STATUS_PENDING_REVIEW
    if status not in ALLOWED_STATUSES:
        raise AppError(HTTP_BAD_REQUEST, INVALID_WILL_STATUS)

    testator_email = normalize_email(body.get("testatorEmail"))
    if not is_valid_email(testator_email):
        raise AppError(HTTP_BAD_REQUEST, INVALID_TESTATOR_EMAIL)

    now = datetime.now(timezone.utc)
    will_id = (body.get("willId") or "").strip()

    if will_id:
        existing = repository.find_will_by_id(db, will_id)
        if not existing:
            raise AppError(HTTP_NOT_FOUND, WILL_NOT_FOUND)
        if normalize_email(existing.get("testatorEmail")) != testator_email:
            raise AppError(HTTP_FORBIDDEN, WILL_ACCESS_DENIED)
        if existing.get("status") == STATUS_PENDING_REVIEW:
            raise AppError(HTTP_FORBIDDEN, WILL_LOCKED_FOR_REVIEW)
        created_at = existing.get("createdAt", now)
    else:
        # willId is always generated server-side when creating a new Will
        # (never trusted from the client) so every fresh document gets a
        # unique identifier — updates to an existing draft reuse it instead.
        will_id = str(uuid.uuid4())
        created_at = now

    document = {
        **body,
        "will": _redact_id_numbers(body.get("will") or {}),
        "willId": will_id,
        "testatorEmail": testator_email,
        "status": status,
        "createdAt": created_at,
        "updatedAt": now,
    }
    repository.upsert_will(db, will_id, document)

    if status == STATUS_PENDING_REVIEW:
        _submit_for_admin_review(db, settings, document)

    return {"willId": will_id, "status": status}


def _submit_for_admin_review(db: Database, settings: Settings, document: dict) -> None:
    # Every review submission always goes to the single configured admin
    # reviewer — there's no admin-selection step anymore.
    repository.insert_admin_will(db, {
        "willId": document["willId"],
        "adminEmail": settings.admin_review_email,
        "assignedAt": datetime.now(timezone.utc),
    })

    testator = (document.get("will") or {}).get("testator") or {}
    testator_name = testator.get("fullName") or "Unknown"
    testator_email = document.get("testatorEmail") or "Unknown"
    email.send_email(
        settings,
        to=settings.admin_review_email,
        subject=f"New Will submitted for review — {testator_name}",
        html=(
            f"<p>A new Will has been submitted for review.</p>"
            f"<ul>"
            f"<li><strong>Testator:</strong> {testator_name}</li>"
            f"<li><strong>Testator email:</strong> {testator_email}</li>"
            f"<li><strong>Will ID:</strong> {document['willId']}</li>"
            f"</ul>"
        ),
    )


def list_testator_wills(db: Database, email: str) -> dict:
    email = normalize_email(email)
    if not is_valid_email(email):
        raise AppError(HTTP_BAD_REQUEST, INVALID_TESTATOR_EMAIL)

    cutoff = datetime.now(timezone.utc) - timedelta(days=TESTATOR_WILL_VISIBILITY_DAYS)
    wills = []
    for w in repository.find_wills_by_testator_email_since(db, email, cutoff):
        testator = (w.get("will") or {}).get("testator") or {}
        updated_at = w.get("updatedAt")
        wills.append({
            "willId": w.get("willId"),
            "testatorEmail": w.get("testatorEmail") or "",
            "fullLegalName": testator.get("fullName") or "",
            "updatedAt": updated_at.isoformat() if updated_at else None,
            "status": w.get("status") or STATUS_DRAFT,
        })

    wills.sort(key=lambda w: w["updatedAt"] or "", reverse=True)
    return {"wills": wills}


def get_will_for_edit(db: Database, will_id: str, email: str) -> dict:
    email = normalize_email(email)
    if not is_valid_email(email):
        raise AppError(HTTP_BAD_REQUEST, INVALID_TESTATOR_EMAIL)

    document = repository.find_will_by_id(db, will_id)
    if not document:
        raise AppError(HTTP_NOT_FOUND, WILL_NOT_FOUND)
    if normalize_email(document.get("testatorEmail")) != email:
        raise AppError(HTTP_FORBIDDEN, WILL_ACCESS_DENIED)

    return {
        "willId": document["willId"],
        "will": document.get("will") or {},
        "testatorEmail": document.get("testatorEmail") or "",
        "status": document.get("status") or STATUS_DRAFT,
        "adminComments": document.get("adminComments"),
    }


def delete_will_for_testator(db: Database, will_id: str, email: str) -> dict:
    email = normalize_email(email)
    if not is_valid_email(email):
        raise AppError(HTTP_BAD_REQUEST, INVALID_TESTATOR_EMAIL)

    document = repository.find_will_by_id(db, will_id)
    if not document:
        raise AppError(HTTP_NOT_FOUND, WILL_NOT_FOUND)
    if normalize_email(document.get("testatorEmail")) != email:
        raise AppError(HTTP_FORBIDDEN, WILL_ACCESS_DENIED)

    # Unlike editing, deletion is allowed regardless of status — a testator
    # can delete a Will that's already PendingReview with the admin.
    repository.delete_will(db, will_id)
    return {"willId": will_id}
