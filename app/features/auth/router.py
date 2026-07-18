from fastapi import APIRouter, Depends, Request
from pymongo.database import Database

from app.core.config import Settings, get_settings
from app.core.db import get_db
from app.features.auth import service
from app.features.auth.schemas import AuthResponse, ErrorResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])

ERROR_RESPONSES = {
    400: {"model": ErrorResponse},
    401: {"model": ErrorResponse},
    500: {"model": ErrorResponse},
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
    "/admin-signup", response_model=AuthResponse, status_code=201,
    responses={**ERROR_RESPONSES, 409: {"model": ErrorResponse}},
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
    responses={**ERROR_RESPONSES, 403: {"model": ErrorResponse}},
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
