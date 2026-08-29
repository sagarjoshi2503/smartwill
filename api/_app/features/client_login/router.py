from fastapi import APIRouter, Depends, Request
from pymongo.database import Database

from _app.core.config import Settings, get_settings
from _app.core.db import get_db
from _app.core.jwt_auth import get_current_testator, get_current_testator_allow_expired
from _app.core.request_body import json_body
from _app.features.client_login import service
from _app.features.client_login.schemas import (
    ErrorResponse, LogoutResponse, MobileChangeRequestResponse, MobileChangeVerifyResponse, ProfileResponse,
)
from _app.shared.constants import HTTP_BAD_REQUEST, HTTP_SERVER_ERROR, HTTP_TOO_MANY_REQUESTS, HTTP_UNAUTHORIZED

router = APIRouter(prefix="/api/auth", tags=["client-login"])

ERROR_RESPONSES = {
    HTTP_UNAUTHORIZED: {"model": ErrorResponse},
    HTTP_SERVER_ERROR: {"model": ErrorResponse},
}


@router.post(
    "/logout", response_model=LogoutResponse, responses=ERROR_RESPONSES,
    summary="Mark a testator/client as logged out (clientlogin.loginStatus)",
)
async def logout(
    db: Database = Depends(get_db),
    # Accepts an already-expired token on purpose — the frontend calls this
    # both on an explicit "Log out" click and when it locally detects an
    # expired session on load, so a status update isn't lost just because
    # the token happened to expire first (see get_current_testator_allow_expired).
    testator_email: str = Depends(get_current_testator_allow_expired),
):
    return service.logout(db, testator_email)


# Separate router/prefix — the endpoints above are part of the auth surface
# (`/api/auth/...`), these are the client's own account profile
# (`/api/client/profile/...`). Both are registered in main.py.
profile_router = APIRouter(prefix="/api/client/profile", tags=["client-profile"])

PROFILE_ERROR_RESPONSES = {
    HTTP_BAD_REQUEST: {"model": ErrorResponse},
    HTTP_UNAUTHORIZED: {"model": ErrorResponse},
    HTTP_SERVER_ERROR: {"model": ErrorResponse},
}


@profile_router.get(
    "", response_model=ProfileResponse, responses=PROFILE_ERROR_RESPONSES,
    summary="Get the authenticated testator's profile (email + mobile number)",
)
async def get_profile(db: Database = Depends(get_db), testator_email: str = Depends(get_current_testator)):
    return service.get_profile(db, testator_email)


@profile_router.post(
    "/mobile/request-otp", response_model=MobileChangeRequestResponse,
    responses={**PROFILE_ERROR_RESPONSES, HTTP_TOO_MANY_REQUESTS: {"model": ErrorResponse}},
    summary="Request an OTP sent to a new mobile number, to verify it before changing the profile",
)
async def request_mobile_change(
    request: Request, settings: Settings = Depends(get_settings),
    testator_email: str = Depends(get_current_testator),
):
    body = await json_body(request)
    return service.request_mobile_change(testator_email, body, settings)


@profile_router.post(
    "/mobile/verify-otp", response_model=MobileChangeVerifyResponse, responses=PROFILE_ERROR_RESPONSES,
    summary="Verify the new mobile number's OTP and update the profile",
)
async def verify_mobile_change(
    request: Request, db: Database = Depends(get_db), testator_email: str = Depends(get_current_testator),
):
    body = await json_body(request)
    return service.verify_mobile_change(db, testator_email, body)
