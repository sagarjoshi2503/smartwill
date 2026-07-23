from pydantic import BaseModel

from _app.shared.enums import PaymentStatus


class CreateOrderResponse(BaseModel):
    orderId: str
    amount: int
    currency: str


class VerifyPaymentResponse(BaseModel):
    verified: bool


class MarkPaymentFailedResponse(BaseModel):
    willId: str
    paymentStatus: PaymentStatus


class ErrorResponse(BaseModel):
    error: str
