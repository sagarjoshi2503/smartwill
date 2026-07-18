from pydantic import BaseModel


class SaveWillResponse(BaseModel):
    willId: str
    status: str


class ClientOut(BaseModel):
    willId: str
    name: str
    contact: str
    updatedAt: str | None
    status: str


class ClientsResponse(BaseModel):
    clients: list[ClientOut]


class WillDetailResponse(BaseModel):
    willId: str
    will: dict
    testatorEmail: str
    status: str
    adminComments: str | None = None


class DeleteWillResponse(BaseModel):
    willId: str


class ErrorResponse(BaseModel):
    error: str
