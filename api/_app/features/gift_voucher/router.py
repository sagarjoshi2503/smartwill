from fastapi import APIRouter, Depends, Query, Request
from pymongo.database import Database

from _app.core.config import Settings, get_settings
from _app.core.db import get_db
from _app.core.jwt_auth import get_current_admin, get_current_testator
from _app.core.request_body import json_body
from _app.features.gift_voucher import service
from _app.features.gift_voucher.schemas import (
    AdminGenerateVouchersResponse, AdminListVouchersResponse, CreateVoucherOrderResponse, ErrorResponse,
    PurchaseVoucherResponse, RedeemVoucherResponse, VerifyVoucherResponse,
)
from _app.shared.constants import HTTP_BAD_REQUEST, HTTP_FORBIDDEN, HTTP_NOT_FOUND, HTTP_SERVER_ERROR, HTTP_UNAUTHORIZED

router = APIRouter(prefix="/api/gift-voucher", tags=["gift-voucher"])

ERROR_RESPONSES = {
    HTTP_BAD_REQUEST: {"model": ErrorResponse},
    HTTP_SERVER_ERROR: {"model": ErrorResponse},
}


@router.post(
    "/order", response_model=CreateVoucherOrderResponse, responses=ERROR_RESPONSES,
    summary="Create a Razorpay order to buy a Gift a Will voucher (public, unauthenticated)",
)
async def create_order(request: Request, settings: Settings = Depends(get_settings)):
    body = await json_body(request)
    return service.create_order(body, settings)


@router.post(
    "/purchase", response_model=PurchaseVoucherResponse,
    responses={**ERROR_RESPONSES, HTTP_UNAUTHORIZED: {"model": ErrorResponse}},
    summary="Verify a voucher payment and issue the gift code by email (public, unauthenticated)",
)
async def purchase(request: Request, db: Database = Depends(get_db), settings: Settings = Depends(get_settings)):
    body = await json_body(request)
    return service.purchase(db, body, settings)


@router.post(
    "/verify", response_model=VerifyVoucherResponse, responses=ERROR_RESPONSES,
    summary="Look up a voucher code's status (public, unauthenticated) — returns found:false rather than 404",
)
async def verify(request: Request, db: Database = Depends(get_db)):
    body = await json_body(request)
    return service.verify(db, body)


@router.post(
    "/redeem", response_model=RedeemVoucherResponse,
    responses={
        **ERROR_RESPONSES, HTTP_UNAUTHORIZED: {"model": ErrorResponse}, HTTP_FORBIDDEN: {"model": ErrorResponse},
        HTTP_NOT_FOUND: {"model": ErrorResponse},
    },
    summary="Redeem a voucher code against the testator's own Will, skipping payment",
)
async def redeem(
    request: Request, db: Database = Depends(get_db), testator_email: str = Depends(get_current_testator),
):
    body = await json_body(request)
    return service.redeem(db, body, testator_email)


@router.post(
    "/admin/generate", response_model=AdminGenerateVouchersResponse,
    responses={**ERROR_RESPONSES, HTTP_UNAUTHORIZED: {"model": ErrorResponse}},
    summary="Admin generates one or more free gift voucher codes",
)
async def admin_generate(
    request: Request, db: Database = Depends(get_db), settings: Settings = Depends(get_settings),
    admin_email: str = Depends(get_current_admin),
):
    body = await json_body(request)
    return service.admin_generate(db, body, settings)


@router.get(
    "/admin/list", response_model=AdminListVouchersResponse,
    responses={**ERROR_RESPONSES, HTTP_UNAUTHORIZED: {"model": ErrorResponse}},
    summary="Admin lists gift vouchers, optionally filtered by a search term",
)
async def admin_list(
    search: str | None = Query(default=None), db: Database = Depends(get_db),
    admin_email: str = Depends(get_current_admin),
):
    return service.admin_list(db, search)
