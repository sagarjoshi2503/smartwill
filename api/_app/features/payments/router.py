from fastapi import APIRouter, Depends, Request

from _app.core.config import Settings, get_settings
from _app.features.payments import service
from _app.features.payments.schemas import CreateOrderResponse, ErrorResponse, VerifyPaymentResponse
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
async def verify_payment(request: Request, settings: Settings = Depends(get_settings)):
    try:
        body = await request.json()
    except Exception:
        body = {}
    if not isinstance(body, dict):
        body = {}
    return service.verify_payment(body, settings)
