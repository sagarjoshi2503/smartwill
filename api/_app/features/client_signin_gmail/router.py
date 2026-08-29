from fastapi import APIRouter, Depends, Request
from pymongo.database import Database

from _app.core.config import Settings, get_settings
from _app.core.db import get_db
from _app.core.request_body import json_body
from _app.features.client_signin_gmail import service
from _app.features.client_signin_gmail.schemas import AuthResponse, ErrorResponse
from _app.shared.constants import HTTP_BAD_REQUEST, HTTP_SERVER_ERROR, HTTP_UNAUTHORIZED

router = APIRouter(prefix="/api/auth", tags=["client-signin-gmail"])

ERROR_RESPONSES = {
    HTTP_BAD_REQUEST: {"model": ErrorResponse},
    HTTP_UNAUTHORIZED: {"model": ErrorResponse},
    HTTP_SERVER_ERROR: {"model": ErrorResponse},
}


@router.post(
    "/google", response_model=AuthResponse, responses=ERROR_RESPONSES,
    summary="Verify a Google Sign-In ID token",
)
async def verify_google(request: Request, db: Database = Depends(get_db), settings: Settings = Depends(get_settings)):
    body = await json_body(request)
    return service.verify_google_signin(db, body, settings)
