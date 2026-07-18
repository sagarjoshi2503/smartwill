from fastapi import APIRouter, Depends, Request
from pymongo.database import Database

from app.core.config import Settings, get_settings
from app.core.db import get_db
from app.features.auth import service
from app.features.auth.schemas import AuthResponse, ErrorResponse
from app.shared.constants import (
    HTTP_BAD_REQUEST, HTTP_CONFLICT, HTTP_CREATED, HTTP_FORBIDDEN, HTTP_INTERNAL_SERVER_ERROR, HTTP_UNAUTHORIZED,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

ERROR_RESPONSES = {
    HTTP_BAD_REQUEST: {"model": ErrorResponse},
    HTTP_UNAUTHORIZED: {"model": ErrorResponse},
    HTTP_INTERNAL_SERVER_ERROR: {"model": ErrorResponse},
}


@router.post(
    "/google", response_model=AuthResponse, responses=ERROR_RESPONSES,
    summary="Verify a Google Sign-In ID token",
)
async def verify_google(request: Request, settings: Settings = Depends(get_settings)):
    try:
        body = await request.json()
    except Exception:
        body = {}
    return service.verify_google_signin(body, settings)


@router.post(
    "/admin-signup", response_model=AuthResponse, status_code=HTTP_CREATED,
    responses={**ERROR_RESPONSES, HTTP_CONFLICT: {"model": ErrorResponse}},
    summary="Create an Admin Portal account",
)
async def admin_signup(request: Request, db: Database = Depends(get_db)):
    try:
        body = await request.json()
    except Exception:
        body = {}
    if not isinstance(body, dict):
        body = {}
    return service.signup_admin(db, body)


@router.post(
    "/admin-login", response_model=AuthResponse,
    responses={**ERROR_RESPONSES, HTTP_FORBIDDEN: {"model": ErrorResponse}},
    summary="Log in to the Admin Portal",
)
async def admin_login(request: Request, db: Database = Depends(get_db)):
    try:
        body = await request.json()
    except Exception:
        body = {}
    if not isinstance(body, dict):
        body = {}
    return service.login_admin(db, body)
