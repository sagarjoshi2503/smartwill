from fastapi import APIRouter, Depends, Request
from pymongo.database import Database

from _app.core.config import Settings, get_settings
from _app.core.db import get_db
from _app.features.payments import service
from _app.features.payments.schemas import (
    CreateOrderResponse, ErrorResponse, MarkPaymentFailedResponse, VerifyPaymentResponse,
)
from _app.shared.constants import HTTP_BAD_REQUEST, HTTP_SERVER_ERROR, HTTP_UNAUTHORIZED

router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.post(
    "/create-order", response_model=CreateOrderResponse,
    responses={
        HTTP_BAD_REQUEST: {"model": ErrorResponse},
        HTTP_UNAUTHORIZED: {"model": ErrorResponse},
        HTTP_SERVER_ERROR: {"model": ErrorResponse},
    },
    summary="Create a Razorpay order for Standard Checkout",
)
async def create_order(request: Request, settings: Settings = Depends(get_settings)):
    try:
        body = await request.json()
    except Exception:
        body = {}
    if not isinstance(body, dict):
        body = {}
    return service.create_order(body, settings)


@router.post(
    "/verify", response_model=VerifyPaymentResponse,
    responses={HTTP_BAD_REQUEST: {"model": ErrorResponse}, HTTP_SERVER_ERROR: {"model": ErrorResponse}},
    summary="Verify a Razorpay Standard Checkout payment signature",
)
async def verify_payment(request: Request, db: Database = Depends(get_db), settings: Settings = Depends(get_settings)):
    try:
        body = await request.json()
    except Exception:
        body = {}
    if not isinstance(body, dict):
        body = {}
    return service.verify_payment(db, body, settings)


@router.post(
    "/mark-failed", response_model=MarkPaymentFailedResponse,
    responses={HTTP_BAD_REQUEST: {"model": ErrorResponse}, HTTP_SERVER_ERROR: {"model": ErrorResponse}},
    summary="Mark a Will's payment as Failed (checkout cancelled or Razorpay reported failure)",
)
async def mark_payment_failed(request: Request, db: Database = Depends(get_db)):
    try:
        body = await request.json()
    except Exception:
        body = {}
    if not isinstance(body, dict):
        body = {}
    return service.mark_payment_failed(db, body)
