from pydantic import BaseModel

from _app.shared.enums import PaymentStatus


class SaveWillResponse(BaseModel):
    willId: str
    status: str


class ClientOut(BaseModel):
    willId: str
    name: str
    contact: str
    updatedAt: str | None
    status: str
    willType: str
    paymentStatus: PaymentStatus
    paymentAmount: int | None = None


class ClientsResponse(BaseModel):
    clients: list[ClientOut]


class WillDetailResponse(BaseModel):
    willId: str
    will: dict
    testatorEmail: str
    status: str
    willType: str
    adminComments: str | None = None
    paymentStatus: PaymentStatus
    paymentAmount: int | None = None


class DeleteWillResponse(BaseModel):
    willId: str


class ErrorResponse(BaseModel):
    error: str
