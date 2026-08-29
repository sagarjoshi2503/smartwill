import uuid
from datetime import datetime, timedelta, timezone

from pymongo.database import Database

from _app.core.config import Settings
from _app.core.exceptions import AppError
from _app.features.create_will import repository
from _app.features.create_will.pdf_context import MONTHS
from _app.features.create_will.pdf_generator import generate_all_india_will_pdf
from _app.features.create_will.pdf_merge import merge_id_fields
from _app.shared import email
from _app.shared.constants import (
    FLD_ADMIN_COMMENTS, FLD_ADMIN_EMAIL, FLD_ASSIGNED_AT, FLD_CREATED_AT, FLD_CREATED_BY, FLD_FULL_LEGAL_NAME,
    FLD_FULL_NAME, FLD_PAYMENT_AMOUNT, FLD_PAYMENT_STATUS, FLD_SIGN_DAY, FLD_SIGN_MONTH, FLD_SIGN_YEAR, FLD_STATUS,
    FLD_TESTATOR, FLD_TESTATOR_EMAIL, FLD_UPDATED_AT, FLD_WILL, FLD_WILL_ID, FLD_WILL_TYPE, HTTP_BAD_REQUEST,
    HTTP_FORBIDDEN, HTTP_NOT_FOUND, BAD_TESTATOR_EMAIL, BAD_WILL_STATUS, BAD_WILL_TYPE, PDF_UNSUPPORTED_WILL_TYPE,
    STATUS_COMPLETED, STATUS_DRAFT, STATUS_PENDING_REVIEW,
    UNKNOWN_NAME, WILL_ACCESS_DENIED, WILL_REQUIRED, WILL_LOCKED, WILL_NOT_FOUND, SUBMIT_SUBJECT_TMPL,
)
from _app.shared.feature_flags import is_flag_enabled
from _app.shared.redaction import redact_id_numbers
from _app.shared.enums import PaymentStatus, WillType
from _app.shared.validators import escape_html, is_valid_email, normalize_email

# STATUS_COMPLETED is only reachable via the testator's own save path when a
# testator submission skips admin review entirely (see the FLAG_ENABLE_ADMIN_REVIEW
# check below) — it's still gated at submission time, not a free-for-all status
# a testator can just declare.
ALLOWED_STATUSES = {STATUS_DRAFT, STATUS_PENDING_REVIEW, STATUS_COMPLETED}
ALLOWED_WILL_TYPES = {t.value for t in WillType}

# Vercel Flag key — see flags/CLAUDE.md. Defaults to enabled (the existing,
# safe behavior: every paid submission goes to admin review) so an
# unreachable flags service (local dev, AKS) never silently skips legal
# review just because the flag couldn't be evaluated.
FLAG_ENABLE_ADMIN_REVIEW = "enable-admin-review"


def save_will(db: Database, body: dict, settings: Settings, testator_email: str) -> dict:
    if not isinstance(body, dict) or not body:
        raise AppError(HTTP_BAD_REQUEST, WILL_REQUIRED)

    status = body.get(FLD_STATUS) or STATUS_PENDING_REVIEW
    if status not in ALLOWED_STATUSES:
        raise AppError(HTTP_BAD_REQUEST, BAD_WILL_STATUS)

    will_type = body.get(FLD_WILL_TYPE) or ""
    if will_type and will_type not in ALLOWED_WILL_TYPES:
        raise AppError(HTTP_BAD_REQUEST, BAD_WILL_TYPE)

    # The owning testator is always the authenticated identity from the JWT —
    # never the client-supplied testatorEmail field — so a testator can never
    # save/attach a Will under someone else's email.
    testator_email = normalize_email(testator_email)
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

    # A testator can only skip straight to Completed (bypassing admin
    # review) when the "enable-admin-review" flag is off AND this Will's
    # payment already verified as Paid (set server-side by the payments/
    # gift-voucher flows, never trusted from the client body) — otherwise
    # this is treated the same as any other invalid status value. This is
    # the actual enforcement point; the frontend's own flag check only
    # decides which status it *asks* for.
    if status == STATUS_COMPLETED:
        admin_review_enabled = is_flag_enabled(FLAG_ENABLE_ADMIN_REVIEW, default=True)
        if admin_review_enabled or payment_status != PaymentStatus.PAID.value:
            raise AppError(HTTP_BAD_REQUEST, BAD_WILL_STATUS)

    # paymentStatus/paymentAmount are only ever changed by the payments
    # verification flow (see _app/features/payments), never trusted from the
    # client here — so they're excluded from the body spread and set
    # explicitly from the carried-over (or default) values above. createdBy
    # is likewise never trusted from the client — it's fixed at creation and
    # never changes across subsequent saves.
    document = {
        **{k: v for k, v in body.items() if k not in (FLD_PAYMENT_STATUS, FLD_PAYMENT_AMOUNT, FLD_WILL_TYPE, FLD_CREATED_BY)},
        FLD_WILL: redact_id_numbers(body.get(FLD_WILL) or {}),
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
        FLD_ADMIN_EMAIL: settings.admin_review_email,
        FLD_ASSIGNED_AT: datetime.now(timezone.utc),
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
            f"<li><strong>Testator:</strong> {escape_html(testator_name)}</li>"
            f"<li><strong>Testator email:</strong> {escape_html(testator_email)}</li>"
            f"<li><strong>Will ID:</strong> {escape_html(document[FLD_WILL_ID])}</li>"
            f"</ul>"
        ),
    )


def list_testator_wills(db: Database, email: str, settings: Settings) -> dict:
    email = normalize_email(email)
    if not is_valid_email(email):
        raise AppError(HTTP_BAD_REQUEST, BAD_TESTATOR_EMAIL)

    cutoff = datetime.now(timezone.utc) - timedelta(days=settings.will_visible_days)
    wills = []
    for w in repository.find_wills_by_testator_email_since(db, email, cutoff):
        testator = (w.get(FLD_WILL) or {}).get(FLD_TESTATOR) or {}
        updated_at = w.get(FLD_UPDATED_AT)
        wills.append({
            FLD_WILL_ID: w.get(FLD_WILL_ID),
            FLD_TESTATOR_EMAIL: w.get(FLD_TESTATOR_EMAIL) or "",
            FLD_FULL_LEGAL_NAME: testator.get(FLD_FULL_NAME) or "",
            FLD_UPDATED_AT: updated_at.isoformat() if updated_at else None,
            FLD_STATUS: w.get(FLD_STATUS) or STATUS_DRAFT,
            FLD_WILL_TYPE: w.get(FLD_WILL_TYPE) or "",
            FLD_PAYMENT_STATUS: w.get(FLD_PAYMENT_STATUS) or PaymentStatus.NOT_PAID.value,
            FLD_PAYMENT_AMOUNT: w.get(FLD_PAYMENT_AMOUNT),
        })

    wills.sort(key=lambda w: w[FLD_UPDATED_AT] or "", reverse=True)
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


def _with_signing_date_today(will: dict) -> dict:
    """The execution/signing date printed on the Will (opening clause,
    signature page, executor/guardian consent pages) is always "today" —
    the moment the PDF is actually generated/downloaded — never a date the
    testator typed in earlier. testator.signDay/signMonth/signYear still
    exist as real WillState/DB fields (see web/src/types.ts's Testator),
    just with no UI to edit them; this overwrites them on the transient
    dict handed to the PDF renderer only, never persisted back to Mongo."""
    if not isinstance(will.get(FLD_TESTATOR), dict):
        return will
    today = datetime.now(timezone.utc).date()
    testator = {
        **will[FLD_TESTATOR],
        FLD_SIGN_DAY: str(today.day),
        FLD_SIGN_MONTH: MONTHS[today.month - 1],
        FLD_SIGN_YEAR: str(today.year),
    }
    return {**will, FLD_TESTATOR: testator}


def generate_will_pdf(db: Database, will_id: str, id_fields: dict, testator_email: str) -> bytes:
    testator_email = normalize_email(testator_email)
    document = repository.find_will_by_id(db, will_id)
    if not document:
        raise AppError(HTTP_NOT_FOUND, WILL_NOT_FOUND)
    if normalize_email(document.get(FLD_TESTATOR_EMAIL)) != testator_email:
        raise AppError(HTTP_FORBIDDEN, WILL_ACCESS_DENIED)
    if document.get(FLD_WILL_TYPE) != WillType.ALL_INDIA.value:
        raise AppError(HTTP_BAD_REQUEST, PDF_UNSUPPORTED_WILL_TYPE)

    merged_will = merge_id_fields(document.get(FLD_WILL) or {}, id_fields or {})
    merged_will = _with_signing_date_today(merged_will)
    return generate_all_india_will_pdf(merged_will)


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
