from fastapi import APIRouter, Depends, Request

from app.core.config import Settings, get_settings
from app.features.user_signin_otp import service
from app.features.user_signin_otp.schemas import ErrorResponse, OtpRequestResponse, OtpVerifyResponse
from app.shared.constants import HTTP_BAD_REQUEST

router = APIRouter(prefix="/api/auth/otp", tags=["user-signin-otp"])

ERROR_RESPONSES = {HTTP_BAD_REQUEST: {"model": ErrorResponse}}


@router.post(
    "/request", response_model=OtpRequestResponse, responses=ERROR_RESPONSES,
    summary="Request an OTP for mobile sign-in, delivered by SMS via Twilio",
)
async def request_otp(request: Request, settings: Settings = Depends(get_settings)):
    try:
        body = await request.json()
    except Exception:
        body = {}
    if not isinstance(body, dict):
        body = {}
    return service.request_otp(body, settings)


@router.post(
    "/verify", response_model=OtpVerifyResponse, responses=ERROR_RESPONSES,
    summary="Verify a previously requested OTP",
)
async def verify_otp(request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}
    if not isinstance(body, dict):
        body = {}
    return service.verify_otp(body)
