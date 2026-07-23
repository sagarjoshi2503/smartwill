import hashlib
import hmac
import uuid

import requests
from pymongo.database import Database
from requests.auth import HTTPBasicAuth

from _app.core.config import Settings
from _app.core.exceptions import AppError
from _app.core.logging import get_logger
from _app.features.payments import repository
from _app.shared.constants import (
    FLD_AMOUNT, FLD_CURRENCY, FLD_RAZORPAY_ORDER_ID, FLD_RAZORPAY_PAYMENT_ID, FLD_RAZORPAY_SIGNATURE,
    FLD_RECEIPT, FLD_WILL_ID, HTTP_BAD_REQUEST, HTTP_SERVER_ERROR, HTTP_UNAUTHORIZED, RAZORPAY_AUTH_FAILED,
    RAZORPAY_DEFAULT_CURRENCY, RAZORPAY_INVALID_AMOUNT, RAZORPAY_MIN_AMOUNT_PAISE, RAZORPAY_MISSING_FIELDS,
    RAZORPAY_NOT_CONFIGURED, RAZORPAY_ORDER_FAILED, RAZORPAY_ORDERS_URL, RAZORPAY_SIGNATURE_INVALID,
    RAZORPAY_TIMEOUT_SEC, RAZORPAY_WILL_ID_REQUIRED,
)
from _app.shared.enums import PaymentStatus

logger = get_logger(__name__)


def create_order(body: dict, settings: Settings) -> dict:
    if not settings.razorpay_key_id or not settings.razorpay_key_secret:
        raise AppError(HTTP_SERVER_ERROR, RAZORPAY_NOT_CONFIGURED)

    amount = body.get(FLD_AMOUNT)
    if isinstance(amount, bool) or not isinstance(amount, (int, float)) or amount < RAZORPAY_MIN_AMOUNT_PAISE:
        raise AppError(HTTP_BAD_REQUEST, RAZORPAY_INVALID_AMOUNT)

    currency = body.get(FLD_CURRENCY) or RAZORPAY_DEFAULT_CURRENCY
    receipt = body.get(FLD_RECEIPT) or str(uuid.uuid4())

    try:
        response = requests.post(
            RAZORPAY_ORDERS_URL,
            auth=HTTPBasicAuth(settings.razorpay_key_id, settings.razorpay_key_secret),
            json={"amount": int(amount), "currency": currency, "receipt": receipt},
            timeout=RAZORPAY_TIMEOUT_SEC,
        )
    except requests.RequestException:
        logger.warning("Could not reach Razorpay to create an order", exc_info=True)
        raise AppError(HTTP_SERVER_ERROR, RAZORPAY_ORDER_FAILED)

    if response.status_code == 401:
        raise AppError(HTTP_UNAUTHORIZED, RAZORPAY_AUTH_FAILED)
    if not response.ok:
        logger.warning("Razorpay order creation failed: %s %s", response.status_code, response.text)
        raise AppError(HTTP_SERVER_ERROR, RAZORPAY_ORDER_FAILED)

    order = response.json()
    return {"orderId": order["id"], "amount": order["amount"], "currency": order["currency"]}


def verify_payment(db: Database, body: dict, settings: Settings) -> dict:
    if not settings.razorpay_key_secret:
        raise AppError(HTTP_SERVER_ERROR, RAZORPAY_NOT_CONFIGURED)

    order_id = body.get(FLD_RAZORPAY_ORDER_ID)
    payment_id = body.get(FLD_RAZORPAY_PAYMENT_ID)
    signature = body.get(FLD_RAZORPAY_SIGNATURE)
    if not order_id or not payment_id or not signature:
        raise AppError(HTTP_BAD_REQUEST, RAZORPAY_MISSING_FIELDS)

    message = f"{order_id}|{payment_id}".encode()
    expected_signature = hmac.new(settings.razorpay_key_secret.encode(), message, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected_signature, signature):
        raise AppError(HTTP_BAD_REQUEST, RAZORPAY_SIGNATURE_INVALID)

    # The Will this payment belongs to (its willId was passed to Razorpay as
    # the order's "receipt" and is threaded back through here by the
    # frontend) gets its paymentStatus flipped to Paid now that the
    # signature is confirmed genuine.
    will_id = (body.get(FLD_WILL_ID) or "").strip()
    if will_id:
        repository.set_payment_status(db, will_id, PaymentStatus.PAID.value, body.get(FLD_AMOUNT))

    return {"verified": True}


def mark_payment_failed(db: Database, body: dict) -> dict:
    # Called by the frontend when Razorpay Checkout reports a failed payment
    # or the testator dismisses the modal — there's no signature to verify
    # here (no payment ever completed), just a status flip so the Will
    # doesn't sit at NotPaid after a genuine attempt.
    will_id = (body.get(FLD_WILL_ID) or "").strip()
    if not will_id:
        raise AppError(HTTP_BAD_REQUEST, RAZORPAY_WILL_ID_REQUIRED)

    repository.set_payment_status(db, will_id, PaymentStatus.FAILED.value)
    return {FLD_WILL_ID: will_id, "paymentStatus": PaymentStatus.FAILED.value}
