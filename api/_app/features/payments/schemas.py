from pydantic import BaseModel


class CreateOrderResponse(BaseModel):
    orderId: str
    amount: int
    currency: str


class VerifyPaymentResponse(BaseModel):
    verified: bool


class ErrorResponse(BaseModel):
    error: str
