import hashlib
import hmac
import random
import string
import uuid
from datetime import datetime, timedelta, timezone

import requests
from pymongo.database import Database
from requests.auth import HTTPBasicAuth

from _app.core.config import Settings
from _app.core.exceptions import AppError
from _app.core.logging import get_logger
from _app.features.create_will.repository import find_will_by_id
from _app.features.gift_voucher import repository
from _app.features.payments.repository import set_payment_status
from _app.shared import email
from _app.shared.constants import (
    FLD_AMOUNT, FLD_BUYER_EMAIL, FLD_BUYER_NAME, FLD_CODE, FLD_CODES, FLD_CREATED_AT, FLD_CURRENCY,
    FLD_EXPIRES_AT, FLD_FOUND, FLD_MESSAGE, FLD_ORDER_ID, FLD_PAYMENT_ID, FLD_PAYMENT_STATUS, FLD_PLAN_LABEL,
    FLD_QTY,
    FLD_RAZORPAY_ORDER_ID_CAMEL, FLD_RECEIPT, FLD_RECIPIENT_EMAIL, FLD_RECIPIENT_NAME, FLD_REDEEMED_AT,
    FLD_REDEEMED_BY_TESTATOR_EMAIL, FLD_REDEEMED_BY_WILL_ID, FLD_SIGNATURE, FLD_STATUS, FLD_TESTATOR_EMAIL,
    FLD_VALIDITY_MONTHS, FLD_VOUCHERS, FLD_WILL_ID, GIFT_VOUCHER_CODE_GENERATION_ATTEMPTS, GIFT_VOUCHER_DAYS_PER_MONTH,
    GIFT_VOUCHER_CODE_GENERATION_FAILED,
    GIFT_VOUCHER_CODE_PREFIX, GIFT_VOUCHER_CODE_RANDOM_LENGTH, GIFT_VOUCHER_CODE_REQUIRED, GIFT_VOUCHER_EXPIRED,
    GIFT_VOUCHER_INVALID_AMOUNT, GIFT_VOUCHER_NOT_ACTIVE, GIFT_VOUCHER_PLAN_LABEL_REQUIRED,
    GIFT_VOUCHER_QTY_INVALID, GIFT_VOUCHER_RECIPIENT_EMAIL_INVALID, GIFT_VOUCHER_RECIPIENT_NAME_REQUIRED,
    GIFT_VOUCHER_SUBJECT_TMPL, GIFT_VOUCHER_VALIDITY_MONTHS, GIFT_VOUCHER_WILL_ID_REQUIRED, HTTP_BAD_REQUEST,
    HTTP_FORBIDDEN, HTTP_NOT_FOUND, HTTP_SERVER_ERROR, HTTP_UNAUTHORIZED, RAZORPAY_AUTH_FAILED,
    RAZORPAY_DEFAULT_CURRENCY, RAZORPAY_MIN_AMOUNT_PAISE, RAZORPAY_MISSING_FIELDS, RAZORPAY_NOT_CONFIGURED,
    RAZORPAY_ORDER_FAILED, RAZORPAY_ORDERS_URL, RAZORPAY_SIGNATURE_INVALID, RAZORPAY_TIMEOUT_SEC, WILL_ACCESS_DENIED,
    WILL_NOT_FOUND,
)
from _app.shared.enums import PaymentStatus, VoucherStatus
from _app.shared.validators import escape_html, is_valid_email, normalize_email

logger = get_logger(__name__)


def _create_razorpay_order(amount: int, currency: str, receipt: str, settings: Settings) -> dict:
    """Shared "call Razorpay's orders endpoint" logic — same request shape
    payments.service.create_order uses. Kept local to this feature (per this
    repo's "no shared code across siblings" convention, features may still
    duplicate small blocks like this rather than reach into another
    feature's internals)."""
    try:
        response = requests.post(
            RAZORPAY_ORDERS_URL,
            auth=HTTPBasicAuth(settings.razorpay_key_id, settings.razorpay_key_secret),
            json={FLD_AMOUNT: amount, FLD_CURRENCY: currency, FLD_RECEIPT: receipt},
            timeout=RAZORPAY_TIMEOUT_SEC,
        )
    except requests.RequestException:
        logger.warning("Could not reach Razorpay to create a gift voucher order", exc_info=True)
        raise AppError(HTTP_SERVER_ERROR, RAZORPAY_ORDER_FAILED)

    if response.status_code == HTTP_UNAUTHORIZED:
        raise AppError(HTTP_UNAUTHORIZED, RAZORPAY_AUTH_FAILED)
    if not response.ok:
        logger.warning("Razorpay order creation failed: %s %s", response.status_code, response.text)
        raise AppError(HTTP_SERVER_ERROR, RAZORPAY_ORDER_FAILED)

    return response.json()


def create_order(body: dict, settings: Settings) -> dict:
    if not settings.razorpay_key_id or not settings.razorpay_key_secret:
        raise AppError(HTTP_SERVER_ERROR, RAZORPAY_NOT_CONFIGURED)

    amount = body.get(FLD_AMOUNT)
    if isinstance(amount, bool) or not isinstance(amount, (int, float)) or amount < RAZORPAY_MIN_AMOUNT_PAISE:
        raise AppError(HTTP_BAD_REQUEST, GIFT_VOUCHER_INVALID_AMOUNT)

    plan_label = (body.get(FLD_PLAN_LABEL) or "").strip()
    if not plan_label:
        raise AppError(HTTP_BAD_REQUEST, GIFT_VOUCHER_PLAN_LABEL_REQUIRED)

    receipt = str(uuid.uuid4())
    order = _create_razorpay_order(int(amount), RAZORPAY_DEFAULT_CURRENCY, receipt, settings)
    return {FLD_ORDER_ID: order["id"], FLD_AMOUNT: order[FLD_AMOUNT], FLD_CURRENCY: order[FLD_CURRENCY]}


def _generate_unique_code(db: Database) -> str:
    for _ in range(GIFT_VOUCHER_CODE_GENERATION_ATTEMPTS):
        suffix = "".join(
            random.choices(string.ascii_uppercase + string.digits, k=GIFT_VOUCHER_CODE_RANDOM_LENGTH)
        )
        code = f"{GIFT_VOUCHER_CODE_PREFIX}{suffix}"
        if not repository.find_by_code(db, code):
            return code
    raise AppError(HTTP_SERVER_ERROR, GIFT_VOUCHER_CODE_GENERATION_FAILED)


def _voucher_email_html(recipient_name: str, code: str, message: str | None, buyer_name: str | None) -> str:
    greeting = f"Hi {escape_html(recipient_name)}," if recipient_name else "Hi,"
    gifted_by = f"<p>This gift was sent to you by {escape_html(buyer_name)}.</p>" if buyer_name else ""
    custom_message = f"<p><em>{escape_html(message)}</em></p>" if message else ""
    return (
        f"<p>{greeting}</p>"
        f"<p>You've been gifted a Will! Use the code below to redeem it, free of charge, when you create your Will.</p>"
        f"<p style='font-size:20px;font-weight:bold;'>{escape_html(code)}</p>"
        f"{custom_message}"
        f"{gifted_by}"
    )


def _build_voucher_document(
    code: str, plan_label: str, amount: int, buyer_name: str | None, buyer_email: str | None,
    recipient_name: str | None, recipient_email: str | None, message: str | None, validity_months: int,
) -> dict:
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=GIFT_VOUCHER_DAYS_PER_MONTH * validity_months)
    return {
        FLD_CODE: code,
        FLD_STATUS: VoucherStatus.ACTIVE.value,
        FLD_PLAN_LABEL: plan_label,
        FLD_AMOUNT: amount,
        FLD_BUYER_NAME: buyer_name,
        FLD_BUYER_EMAIL: buyer_email,
        FLD_RECIPIENT_NAME: recipient_name,
        FLD_RECIPIENT_EMAIL: recipient_email,
        FLD_MESSAGE: message,
        FLD_CREATED_AT: now.isoformat(),
        FLD_EXPIRES_AT: expires_at.isoformat(),
        FLD_REDEEMED_BY_WILL_ID: None,
        FLD_REDEEMED_BY_TESTATOR_EMAIL: None,
        FLD_REDEEMED_AT: None,
    }


def purchase(db: Database, body: dict, settings: Settings) -> dict:
    if not settings.razorpay_key_secret:
        raise AppError(HTTP_SERVER_ERROR, RAZORPAY_NOT_CONFIGURED)

    order_id = body.get(FLD_RAZORPAY_ORDER_ID_CAMEL)
    payment_id = body.get(FLD_PAYMENT_ID)
    signature = body.get(FLD_SIGNATURE)
    if not order_id or not payment_id or not signature:
        raise AppError(HTTP_BAD_REQUEST, RAZORPAY_MISSING_FIELDS)

    message_bytes = f"{order_id}|{payment_id}".encode()
    expected_signature = hmac.new(settings.razorpay_key_secret.encode(), message_bytes, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected_signature, signature):
        raise AppError(HTTP_BAD_REQUEST, RAZORPAY_SIGNATURE_INVALID)

    plan_label = (body.get(FLD_PLAN_LABEL) or "").strip()
    if not plan_label:
        raise AppError(HTTP_BAD_REQUEST, GIFT_VOUCHER_PLAN_LABEL_REQUIRED)

    amount = body.get(FLD_AMOUNT)
    if isinstance(amount, bool) or not isinstance(amount, (int, float)) or amount < RAZORPAY_MIN_AMOUNT_PAISE:
        raise AppError(HTTP_BAD_REQUEST, GIFT_VOUCHER_INVALID_AMOUNT)

    recipient_name = (body.get(FLD_RECIPIENT_NAME) or "").strip()
    recipient_email = normalize_email(body.get(FLD_RECIPIENT_EMAIL))
    if not recipient_name:
        raise AppError(HTTP_BAD_REQUEST, GIFT_VOUCHER_RECIPIENT_NAME_REQUIRED)
    if not is_valid_email(recipient_email):
        raise AppError(HTTP_BAD_REQUEST, GIFT_VOUCHER_RECIPIENT_EMAIL_INVALID)

    buyer_name = (body.get(FLD_BUYER_NAME) or "").strip() or None
    buyer_email_raw = body.get(FLD_BUYER_EMAIL)
    buyer_email = normalize_email(buyer_email_raw) if buyer_email_raw else None
    custom_message = (body.get(FLD_MESSAGE) or "").strip() or None

    code = _generate_unique_code(db)
    document = _build_voucher_document(
        code, plan_label, int(amount), buyer_name, buyer_email, recipient_name, recipient_email, custom_message,
        GIFT_VOUCHER_VALIDITY_MONTHS,
    )
    repository.insert_voucher(db, document)

    email.send_email(
        settings, to=recipient_email, subject=GIFT_VOUCHER_SUBJECT_TMPL,
        html=_voucher_email_html(recipient_name, code, custom_message, buyer_name),
    )

    return {FLD_CODE: code}


def verify(db: Database, body: dict) -> dict:
    code = (body.get(FLD_CODE) or "").strip().upper()
    if not code:
        raise AppError(HTTP_BAD_REQUEST, GIFT_VOUCHER_CODE_REQUIRED)

    # A lookup miss here is an expected, everyday outcome (the testator
    # mistyped a code, or it's simply invalid) rather than a server-side
    # "not found" error — the frontend needs to render "invalid code"
    # inline without treating it as a fetch failure, so this returns a
    # {found: false} body (200) instead of raising AppError(HTTP_NOT_FOUND, ...).
    document = repository.find_by_code(db, code)
    if not document:
        return {FLD_FOUND: False}

    return {
        FLD_FOUND: True,
        FLD_CODE: document[FLD_CODE],
        FLD_STATUS: document[FLD_STATUS],
        FLD_PLAN_LABEL: document.get(FLD_PLAN_LABEL),
        FLD_AMOUNT: document.get(FLD_AMOUNT),
        FLD_EXPIRES_AT: document.get(FLD_EXPIRES_AT),
    }


def _assert_owns_will(db: Database, will_id: str, testator_email: str) -> None:
    document = find_will_by_id(db, will_id)
    if not document:
        raise AppError(HTTP_NOT_FOUND, WILL_NOT_FOUND)
    if normalize_email(document.get(FLD_TESTATOR_EMAIL)) != normalize_email(testator_email):
        raise AppError(HTTP_FORBIDDEN, WILL_ACCESS_DENIED)


def redeem(db: Database, body: dict, testator_email: str) -> dict:
    code = (body.get(FLD_CODE) or "").strip().upper()
    if not code:
        raise AppError(HTTP_BAD_REQUEST, GIFT_VOUCHER_CODE_REQUIRED)

    will_id = (body.get(FLD_WILL_ID) or "").strip()
    if not will_id:
        raise AppError(HTTP_BAD_REQUEST, GIFT_VOUCHER_WILL_ID_REQUIRED)

    # Ownership is checked *before* the atomic redemption so a testator
    # can't burn someone else's voucher's ACTIVE->REDEEMED transition on a
    # willId they don't own and then be blocked by the ownership check
    # after the code is already spent.
    _assert_owns_will(db, will_id, testator_email)

    document = repository.find_by_code(db, code)
    if not document:
        raise AppError(HTTP_NOT_FOUND, GIFT_VOUCHER_NOT_ACTIVE)

    expires_at = document.get(FLD_EXPIRES_AT)
    if expires_at and datetime.fromisoformat(expires_at) < datetime.now(timezone.utc):
        raise AppError(HTTP_BAD_REQUEST, GIFT_VOUCHER_EXPIRED)

    now = datetime.now(timezone.utc)
    updated = repository.redeem_active_voucher(db, code, {
        FLD_STATUS: VoucherStatus.REDEEMED.value,
        FLD_REDEEMED_BY_WILL_ID: will_id,
        FLD_REDEEMED_BY_TESTATOR_EMAIL: normalize_email(testator_email),
        FLD_REDEEMED_AT: now.isoformat(),
    })
    if not updated:
        # Someone else redeemed it first (or it was never Active) — the
        # find_one_and_update's status:ACTIVE filter didn't match.
        raise AppError(HTTP_BAD_REQUEST, GIFT_VOUCHER_NOT_ACTIVE)

    set_payment_status(db, will_id, PaymentStatus.PAID.value)
    return {FLD_WILL_ID: will_id, FLD_CODE: code, FLD_PAYMENT_STATUS: PaymentStatus.PAID.value}


def admin_generate(db: Database, body: dict, settings: Settings) -> dict:
    plan_label = (body.get(FLD_PLAN_LABEL) or "").strip()
    if not plan_label:
        raise AppError(HTTP_BAD_REQUEST, GIFT_VOUCHER_PLAN_LABEL_REQUIRED)

    amount = body.get(FLD_AMOUNT)
    if isinstance(amount, bool) or not isinstance(amount, (int, float)) or amount < 0:
        raise AppError(HTTP_BAD_REQUEST, GIFT_VOUCHER_INVALID_AMOUNT)

    qty = body.get(FLD_QTY, 1)
    if isinstance(qty, bool) or not isinstance(qty, int) or qty < 1:
        raise AppError(HTTP_BAD_REQUEST, GIFT_VOUCHER_QTY_INVALID)

    validity_months = body.get(FLD_VALIDITY_MONTHS) or GIFT_VOUCHER_VALIDITY_MONTHS

    buyer_name = (body.get(FLD_BUYER_NAME) or "").strip() or None
    buyer_email_raw = body.get(FLD_BUYER_EMAIL)
    buyer_email = normalize_email(buyer_email_raw) if buyer_email_raw else None
    recipient_name = (body.get(FLD_RECIPIENT_NAME) or "").strip() or None
    recipient_email_raw = body.get(FLD_RECIPIENT_EMAIL)
    recipient_email = normalize_email(recipient_email_raw) if recipient_email_raw else None
    custom_message = (body.get(FLD_MESSAGE) or "").strip() or None

    documents = []
    for _ in range(qty):
        code = _generate_unique_code(db)
        document = _build_voucher_document(
            code, plan_label, int(amount), buyer_name, buyer_email, recipient_name, recipient_email,
            custom_message, validity_months,
        )
        documents.append(document)

    repository.insert_vouchers(db, documents)

    if recipient_email and is_valid_email(recipient_email):
        for document in documents:
            email.send_email(
                settings, to=recipient_email, subject=GIFT_VOUCHER_SUBJECT_TMPL,
                html=_voucher_email_html(recipient_name or "", document[FLD_CODE], custom_message, buyer_name),
            )

    return {
        FLD_CODES: [
            {
                FLD_CODE: d[FLD_CODE],
                FLD_PLAN_LABEL: d[FLD_PLAN_LABEL],
                FLD_AMOUNT: d[FLD_AMOUNT],
                FLD_RECIPIENT_NAME: d.get(FLD_RECIPIENT_NAME),
                FLD_RECIPIENT_EMAIL: d.get(FLD_RECIPIENT_EMAIL),
                FLD_EXPIRES_AT: d[FLD_EXPIRES_AT],
            }
            for d in documents
        ]
    }


def admin_list(db: Database, search: str | None = None) -> dict:
    documents = repository.list_vouchers(db, search)
    return {
        FLD_VOUCHERS: [
            {
                FLD_CODE: d[FLD_CODE],
                FLD_RECIPIENT_NAME: d.get(FLD_RECIPIENT_NAME),
                FLD_RECIPIENT_EMAIL: d.get(FLD_RECIPIENT_EMAIL),
                FLD_PLAN_LABEL: d.get(FLD_PLAN_LABEL),
                FLD_AMOUNT: d.get(FLD_AMOUNT),
                FLD_STATUS: d.get(FLD_STATUS),
                FLD_CREATED_AT: d.get(FLD_CREATED_AT),
                FLD_EXPIRES_AT: d.get(FLD_EXPIRES_AT),
            }
            for d in documents
        ]
    }
