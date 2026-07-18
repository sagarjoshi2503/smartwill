import uuid
from datetime import datetime, timezone

from pymongo.database import Database

from app.core.config import Settings
from app.core.exceptions import AppError
from app.features.admin_dashboard import repository
from app.shared import email
from app.shared.constants import (
    COMMENTS_REQUIRED, HTTP_BAD_REQUEST, HTTP_NOT_FOUND, INVALID_TESTATOR_EMAIL, INVALID_WILL_STATUS, STATUS_DRAFT,
    STATUS_COMPLETED, STATUS_PENDING_REVIEW, WILL_DATA_REQUIRED, WILL_NOT_FOUND,
)
from app.shared.validators import is_valid_email, normalize_email

ALLOWED_STATUSES = {STATUS_DRAFT, STATUS_PENDING_REVIEW, STATUS_COMPLETED}


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


def save_will_as_admin(db: Database, body: dict, settings: Settings) -> dict:
    # Admin-driven saves (e.g. save-and-complete for a client) bypass the
    # ownership/lock checks that apply to testator-driven saves — an admin
    # can create or update any Will regardless of who submitted it.
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
        created_at = existing.get("createdAt", now)
    else:
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
    if status == STATUS_COMPLETED:
        reviewer_email = normalize_email(body.get("reviewerEmail")) if body.get("reviewerEmail") else None
        if reviewer_email:
            document["reviewerEmail"] = reviewer_email
    repository.upsert_will(db, will_id, document)

    if status == STATUS_PENDING_REVIEW:
        _submit_for_admin_review(db, settings, document)

    return {"willId": will_id, "status": status}


def _submit_for_admin_review(db: Database, settings: Settings, document: dict) -> None:
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


def list_admin_wills(db: Database) -> dict:
    clients = []
    for w in repository.find_all_wills(db):
        testator = (w.get("will") or {}).get("testator") or {}
        updated_at = w.get("updatedAt")
        clients.append({
            "willId": w.get("willId"),
            "name": testator.get("fullName") or "",
            "contact": w.get("testatorEmail") or "",
            "updatedAt": updated_at.isoformat() if updated_at else None,
            "status": w.get("status") or STATUS_DRAFT,
        })

    clients.sort(key=lambda c: c["updatedAt"] or "", reverse=True)
    return {"clients": clients}


def get_will_as_admin(db: Database, will_id: str) -> dict:
    # No ownership check — the admin reviewer can open any submitted Will.
    document = repository.find_will_by_id(db, will_id)
    if not document:
        raise AppError(HTTP_NOT_FOUND, WILL_NOT_FOUND)

    return {
        "willId": document["willId"],
        "will": document.get("will") or {},
        "testatorEmail": document.get("testatorEmail") or "",
        "status": document.get("status") or STATUS_DRAFT,
        "adminComments": document.get("adminComments"),
    }


def admin_complete_will(db: Database, will_id: str, body: dict) -> dict:
    document = repository.find_will_by_id(db, will_id)
    if not document:
        raise AppError(HTTP_NOT_FOUND, WILL_NOT_FOUND)

    updated_will = body.get("will") if isinstance(body, dict) else None
    reviewer_email = None
    if isinstance(body, dict) and body.get("reviewerEmail"):
        reviewer_email = normalize_email(body.get("reviewerEmail"))
    document = {
        **document,
        **({"will": _redact_id_numbers(updated_will)} if updated_will is not None else {}),
        "status": STATUS_COMPLETED,
        "updatedAt": datetime.now(timezone.utc),
        **({"reviewerEmail": reviewer_email} if reviewer_email else {}),
    }
    repository.upsert_will(db, will_id, document)
    return {"willId": will_id, "status": STATUS_COMPLETED}


def admin_send_back_will(db: Database, will_id: str, comments: str, settings: Settings) -> dict:
    comments = (comments or "").strip()
    if not comments:
        raise AppError(HTTP_BAD_REQUEST, COMMENTS_REQUIRED)

    document = repository.find_will_by_id(db, will_id)
    if not document:
        raise AppError(HTTP_NOT_FOUND, WILL_NOT_FOUND)

    document = {
        **document,
        "status": STATUS_DRAFT,
        "adminComments": comments,
        "updatedAt": datetime.now(timezone.utc),
    }
    repository.upsert_will(db, will_id, document)

    testator_email = document.get("testatorEmail")
    testator_name = (document.get("will") or {}).get("testator", {}).get("fullName") or "there"
    if testator_email:
        email.send_email(
            settings,
            to=testator_email,
            subject="Your Will needs a few changes",
            html=(
                f"<p>Hi {testator_name},</p>"
                f"<p>Your Will submission has been reviewed and needs some changes before it can be completed:</p>"
                f"<p>{comments}</p>"
                f"<p>Please log back in to update and resubmit your Will.</p>"
            ),
        )

    return {"willId": will_id, "status": STATUS_DRAFT}


def delete_will_as_admin(db: Database, will_id: str) -> dict:
    # No ownership check — the admin reviewer can delete any submitted Will,
    # unlike the testator-scoped delete in the create_will module.
    document = repository.find_will_by_id(db, will_id)
    if not document:
        raise AppError(HTTP_NOT_FOUND, WILL_NOT_FOUND)

    repository.delete_will(db, will_id)
    return {"willId": will_id}
