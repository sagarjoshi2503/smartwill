from pydantic import BaseModel

from _app.shared.enums import VoucherStatus


class CreateVoucherOrderResponse(BaseModel):
    orderId: str
    amount: int
    currency: str


class PurchaseVoucherResponse(BaseModel):
    code: str


class VerifyVoucherResponse(BaseModel):
    found: bool
    code: str | None = None
    status: VoucherStatus | None = None
    planLabel: str | None = None
    amount: int | None = None
    expiresAt: str | None = None


class RedeemVoucherResponse(BaseModel):
    willId: str
    code: str
    paymentStatus: str


class GeneratedVoucher(BaseModel):
    code: str
    planLabel: str
    amount: int
    recipientName: str | None = None
    recipientEmail: str | None = None
    expiresAt: str


class AdminGenerateVouchersResponse(BaseModel):
    codes: list[GeneratedVoucher]


class VoucherSummary(BaseModel):
    code: str
    recipientName: str | None = None
    recipientEmail: str | None = None
    planLabel: str
    amount: int
    status: VoucherStatus
    createdAt: str
    expiresAt: str


class AdminListVouchersResponse(BaseModel):
    vouchers: list[VoucherSummary]


class ErrorResponse(BaseModel):
    error: str
