from fastapi import APIRouter, Depends, Request
from pymongo.database import Database

from _app.core.config import Settings, get_settings
from _app.core.db import get_db
from _app.core.request_body import json_body
from _app.features.user_signin_otp import service
from _app.features.user_signin_otp.schemas import EmailOtpVerifyResponse, ErrorResponse, OtpRequestResponse, OtpVerifyResponse
from _app.shared.constants import HTTP_BAD_REQUEST

router = APIRouter(prefix="/api/auth/otp", tags=["user-signin-otp"])

ERROR_RESPONSES = {HTTP_BAD_REQUEST: {"model": ErrorResponse}}


@router.post(
    "/request", response_model=OtpRequestResponse, responses=ERROR_RESPONSES,
    summary="Request an OTP for mobile sign-in, delivered by SMS via Twilio",
)
async def request_otp(request: Request, settings: Settings = Depends(get_settings)):
    body = await json_body(request)
    return service.request_otp(body, settings)


@router.post(
    "/verify", response_model=OtpVerifyResponse, responses=ERROR_RESPONSES,
    summary="Verify a previously requested phone OTP — sends the email second factor on success, no session token yet",
)
async def verify_otp(request: Request, settings: Settings = Depends(get_settings)):
    body = await json_body(request)
    return service.verify_otp(body, settings)


@router.post(
    "/verify-email", response_model=EmailOtpVerifyResponse, responses=ERROR_RESPONSES,
    summary="Verify the email code sent after a successful phone OTP — issues the session token",
)
async def verify_email_otp(request: Request, db: Database = Depends(get_db), settings: Settings = Depends(get_settings)):
    body = await json_body(request)
    return service.verify_email_otp(db, body, settings)
