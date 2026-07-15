from fastapi import APIRouter, Depends, Request
from pymongo.database import Database

from app.core.config import Settings, get_settings
from app.core.db import get_db
from app.features.will import service
from app.features.will.schemas import ClientsResponse, ErrorResponse, SaveWillResponse

router = APIRouter(prefix="/api/will", tags=["will"])

ERROR_RESPONSES = {400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}}


@router.post(
    "/save", response_model=SaveWillResponse, status_code=201,
    responses=ERROR_RESPONSES, summary="Save a drafted Will",
)
async def save(request: Request, db: Database = Depends(get_db), settings: Settings = Depends(get_settings)):
    try:
        body = await request.json()
    except Exception:
        body = None
    if not isinstance(body, dict):
        body = None
    return service.save_will(db, body or {}, settings)


@router.get(
    "/lawyer-wills", response_model=ClientsResponse, responses={500: {"model": ErrorResponse}},
    summary="List all Wills submitted for admin review",
)
async def lawyer_wills(db: Database = Depends(get_db)):
    return service.list_admin_wills(db)
