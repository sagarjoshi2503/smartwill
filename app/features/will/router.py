from fastapi import APIRouter, Depends, Query, Request
from pymongo.database import Database

from app.core.db import get_db
from app.features.will import service
from app.features.will.schemas import AssignLawyerResponse, ClientsResponse, ErrorResponse, LawyersResponse, SaveWillResponse

router = APIRouter(prefix="/api/will", tags=["will"])

ERROR_RESPONSES = {400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}}


@router.post(
    "/save", response_model=SaveWillResponse, status_code=201,
    responses=ERROR_RESPONSES, summary="Save a drafted Will",
)
async def save(request: Request, db: Database = Depends(get_db)):
    try:
        body = await request.json()
    except Exception:
        body = None
    if not isinstance(body, dict):
        body = None
    return service.save_will(db, body or {})


@router.get(
    "/lawyers", response_model=LawyersResponse, responses=ERROR_RESPONSES,
    summary="List registered lawyers",
)
async def lawyers(db: Database = Depends(get_db)):
    return service.list_lawyers(db)


@router.post(
    "/assign-lawyer", response_model=AssignLawyerResponse, status_code=201,
    responses={**ERROR_RESPONSES, 404: {"model": ErrorResponse}},
    summary="Submit a saved Will to a lawyer for review",
)
async def assign_lawyer(request: Request, db: Database = Depends(get_db)):
    try:
        body = await request.json()
    except Exception:
        body = {}
    if not isinstance(body, dict):
        body = {}
    return service.assign_lawyer(db, body)


@router.get(
    "/lawyer-wills", response_model=ClientsResponse, responses=ERROR_RESPONSES,
    summary="List the Wills assigned to a lawyer",
)
async def lawyer_wills(email: str = Query(""), db: Database = Depends(get_db)):
    return service.list_lawyer_wills(db, email)
