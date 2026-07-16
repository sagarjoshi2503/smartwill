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


class TestatorWillOut(BaseModel):
    willId: str
    testatorEmail: str
    fullLegalName: str
    updatedAt: str | None
    status: str


class TestatorWillsResponse(BaseModel):
    wills: list[TestatorWillOut]


class WillDetailResponse(BaseModel):
    willId: str
    will: dict
    testatorEmail: str
    status: str


class DeleteWillResponse(BaseModel):
    willId: str


class ErrorResponse(BaseModel):
    error: str
