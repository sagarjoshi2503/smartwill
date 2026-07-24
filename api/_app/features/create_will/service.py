import uuid
from datetime import datetime, timedelta, timezone

from pymongo.database import Database

from _app.core.config import Settings
from _app.core.exceptions import AppError
from _app.features.create_will import repository
from _app.shared import email
from _app.shared.constants import (
    FLD_AADHAAR_NUMBER, FLD_ADMIN_COMMENTS, FLD_CREATED_AT, FLD_CREATED_BY, FLD_EXECUTOR, FLD_FULL_NAME,
    FLD_GUARDIAN, FLD_ID_NUMBER, FLD_JOINT_ID, FLD_PAN, FLD_PAYMENT_AMOUNT, FLD_PAYMENT_STATUS,
    FLD_RESIDUAL_ID, FLD_SPOUSE_AADHAAR_NUMBER, FLD_STATUS, FLD_SUB_ID, FLD_TESTATOR, FLD_TESTATOR_EMAIL,
    FLD_UPDATED_AT, FLD_WILL, FLD_WILL_ID, FLD_WILL_TYPE, FLD_WITNESSES, HTTP_BAD_REQUEST, HTTP_FORBIDDEN,
    HTTP_NOT_FOUND, BAD_TESTATOR_EMAIL, BAD_WILL_STATUS, BAD_WILL_TYPE, STATUS_DRAFT, STATUS_PENDING_REVIEW,
    WILL_VISIBLE_DAYS, UNKNOWN_NAME, WILL_ACCESS_DENIED, WILL_REQUIRED, WILL_LOCKED, WILL_NOT_FOUND,
    SUBMIT_SUBJECT_TMPL,
)
from _app.shared.enums import PaymentStatus, WillType
from _app.shared.validators import is_valid_email, normalize_email

ALLOWED_STATUSES = {STATUS_DRAFT, STATUS_PENDING_REVIEW}
ALLOWED_WILL_TYPES = {t.value for t in WillType}


def _redact_id_numbers(will_data: dict) -> dict:
    """ID numbers (Aadhaar/PAN/etc.) are sensitive and only needed transiently
    in the browser to render the generated Will document — they must never be
    persisted to the database."""
    if not isinstance(will_data, dict):
        return will_data

    redacted = dict(will_data)
    if isinstance(redacted.get(FLD_TESTATOR), dict):
        redacted[FLD_TESTATOR] = {
            **redacted[FLD_TESTATOR], FLD_PAN: "", FLD_AADHAAR_NUMBER: "", FLD_SPOUSE_AADHAAR_NUMBER: "",
        }
    if isinstance(redacted.get(FLD_EXECUTOR), dict):
        redacted[FLD_EXECUTOR] = {
            **redacted[FLD_EXECUTOR], FLD_ID_NUMBER: "", FLD_JOINT_ID: "", FLD_SUB_ID: "",
        }
    if isinstance(redacted.get(FLD_GUARDIAN), dict):
        redacted[FLD_GUARDIAN] = {**redacted[FLD_GUARDIAN], FLD_ID_NUMBER: "", FLD_SUB_ID: ""}
    if FLD_RESIDUAL_ID in redacted:
        redacted[FLD_RESIDUAL_ID] = ""
    if isinstance(redacted.get(FLD_WITNESSES), list):
        redacted[FLD_WITNESSES] = [
            {**w, FLD_AADHAAR_NUMBER: ""} if isinstance(w, dict) else w for w in redacted[FLD_WITNESSES]
        ]
    return redacted


def save_will(db: Database, body: dict, settings: Settings) -> dict:
    if not isinstance(body, dict) or not body:
        raise AppError(HTTP_BAD_REQUEST, WILL_REQUIRED)

    status = body.get(FLD_STATUS) or STATUS_PENDING_REVIEW
    if status not in ALLOWED_STATUSES:
        raise AppError(HTTP_BAD_REQUEST, BAD_WILL_STATUS)

    will_type = body.get(FLD_WILL_TYPE) or ""
    if will_type and will_type not in ALLOWED_WILL_TYPES:
        raise AppError(HTTP_BAD_REQUEST, BAD_WILL_TYPE)

    testator_email = normalize_email(body.get(FLD_TESTATOR_EMAIL))
    if not is_valid_email(testator_email):
        raise AppError(HTTP_BAD_REQUEST, BAD_TESTATOR_EMAIL)

    now = datetime.now(timezone.utc)
    will_id = (body.get(FLD_WILL_ID) or "").strip()

    if will_id:
        existing = repository.find_will_by_id(db, will_id)
        if not existing:
            raise AppError(HTTP_NOT_FOUND, WILL_NOT_FOUND)
        if normalize_email(existing.get(FLD_TESTATOR_EMAIL)) != testator_email:
            raise AppError(HTTP_FORBIDDEN, WILL_ACCESS_DENIED)
        if existing.get(FLD_STATUS) == STATUS_PENDING_REVIEW:
            raise AppError(HTTP_FORBIDDEN, WILL_LOCKED)
        created_at = existing.get(FLD_CREATED_AT, now)
        created_by = existing.get(FLD_CREATED_BY) or testator_email
        payment_status = existing.get(FLD_PAYMENT_STATUS) or PaymentStatus.NOT_PAID.value
        payment_amount = existing.get(FLD_PAYMENT_AMOUNT)
        # willType is client-selected, but a save that omits it (rather than
        # explicitly clearing it) shouldn't blank out a type chosen earlier.
        will_type = will_type or existing.get(FLD_WILL_TYPE) or ""
    else:
        # willId is always generated server-side when creating a new Will
        # (never trusted from the client) so every fresh document gets a
        # unique identifier — updates to an existing draft reuse it instead.
        will_id = str(uuid.uuid4())
        created_at = now
        # This endpoint is only ever reached by the testator's own save flow
        # (admin-initiated creates go through admin_dashboard.save_will_as_admin),
        # so the testator is always the creator here.
        created_by = testator_email
        payment_status = PaymentStatus.NOT_PAID.value
        payment_amount = None

    # paymentStatus/paymentAmount are only ever changed by the payments
    # verification flow (see _app/features/payments), never trusted from the
    # client here — so they're excluded from the body spread and set
    # explicitly from the carried-over (or default) values above. createdBy
    # is likewise never trusted from the client — it's fixed at creation and
    # never changes across subsequent saves.
    document = {
        **{k: v for k, v in body.items() if k not in (FLD_PAYMENT_STATUS, FLD_PAYMENT_AMOUNT, FLD_WILL_TYPE, FLD_CREATED_BY)},
        FLD_WILL: _redact_id_numbers(body.get(FLD_WILL) or {}),
        FLD_WILL_ID: will_id,
        FLD_TESTATOR_EMAIL: testator_email,
        FLD_STATUS: status,
        FLD_WILL_TYPE: will_type,
        FLD_CREATED_AT: created_at,
        FLD_CREATED_BY: created_by,
        FLD_UPDATED_AT: now,
        FLD_PAYMENT_STATUS: payment_status,
        FLD_PAYMENT_AMOUNT: payment_amount,
    }
    repository.upsert_will(db, will_id, document)

    if status == STATUS_PENDING_REVIEW:
        _submit_for_admin_review(db, settings, document)

    return {FLD_WILL_ID: will_id, FLD_STATUS: status}


def _submit_for_admin_review(db: Database, settings: Settings, document: dict) -> None:
    # Every review submission always goes to the single configured admin
    # reviewer — there's no admin-selection step anymore.
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


def list_testator_wills(db: Database, email: str) -> dict:
    email = normalize_email(email)
    if not is_valid_email(email):
        raise AppError(HTTP_BAD_REQUEST, BAD_TESTATOR_EMAIL)

    cutoff = datetime.now(timezone.utc) - timedelta(days=WILL_VISIBLE_DAYS)
    wills = []
    for w in repository.find_wills_by_testator_email_since(db, email, cutoff):
        testator = (w.get(FLD_WILL) or {}).get(FLD_TESTATOR) or {}
        updated_at = w.get(FLD_UPDATED_AT)
        wills.append({
            FLD_WILL_ID: w.get(FLD_WILL_ID),
            FLD_TESTATOR_EMAIL: w.get(FLD_TESTATOR_EMAIL) or "",
            "fullLegalName": testator.get(FLD_FULL_NAME) or "",
            FLD_UPDATED_AT: updated_at.isoformat() if updated_at else None,
            FLD_STATUS: w.get(FLD_STATUS) or STATUS_DRAFT,
            FLD_WILL_TYPE: w.get(FLD_WILL_TYPE) or "",
            FLD_PAYMENT_STATUS: w.get(FLD_PAYMENT_STATUS) or PaymentStatus.NOT_PAID.value,
            FLD_PAYMENT_AMOUNT: w.get(FLD_PAYMENT_AMOUNT),
        })

    wills.sort(key=lambda w: w["updatedAt"] or "", reverse=True)
    return {"wills": wills}


def get_will_for_edit(db: Database, will_id: str, email: str) -> dict:
    email = normalize_email(email)
    if not is_valid_email(email):
        raise AppError(HTTP_BAD_REQUEST, BAD_TESTATOR_EMAIL)

    document = repository.find_will_by_id(db, will_id)
    if not document:
        raise AppError(HTTP_NOT_FOUND, WILL_NOT_FOUND)
    if normalize_email(document.get(FLD_TESTATOR_EMAIL)) != email:
        raise AppError(HTTP_FORBIDDEN, WILL_ACCESS_DENIED)

    return {
        FLD_WILL_ID: document[FLD_WILL_ID],
        FLD_WILL: document.get(FLD_WILL) or {},
        FLD_TESTATOR_EMAIL: document.get(FLD_TESTATOR_EMAIL) or "",
        FLD_STATUS: document.get(FLD_STATUS) or STATUS_DRAFT,
        FLD_WILL_TYPE: document.get(FLD_WILL_TYPE) or "",
        FLD_ADMIN_COMMENTS: document.get(FLD_ADMIN_COMMENTS),
        FLD_PAYMENT_STATUS: document.get(FLD_PAYMENT_STATUS) or PaymentStatus.NOT_PAID.value,
        FLD_PAYMENT_AMOUNT: document.get(FLD_PAYMENT_AMOUNT),
    }


def delete_will_for_testator(db: Database, will_id: str, email: str) -> dict:
    email = normalize_email(email)
    if not is_valid_email(email):
        raise AppError(HTTP_BAD_REQUEST, BAD_TESTATOR_EMAIL)

    document = repository.find_will_by_id(db, will_id)
    if not document:
        raise AppError(HTTP_NOT_FOUND, WILL_NOT_FOUND)
    if normalize_email(document.get(FLD_TESTATOR_EMAIL)) != email:
        raise AppError(HTTP_FORBIDDEN, WILL_ACCESS_DENIED)

    # Unlike editing, deletion is allowed regardless of status — a testator
    # can delete a Will that's already PendingReview with the admin.
    repository.delete_will(db, will_id)
    return {FLD_WILL_ID: will_id}
