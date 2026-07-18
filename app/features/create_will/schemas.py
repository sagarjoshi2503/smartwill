from pydantic import BaseModel


class SaveWillResponse(BaseModel):
    willId: str
    status: str


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
    adminComments: str | None = None


class DeleteWillResponse(BaseModel):
    willId: str


class ErrorResponse(BaseModel):
    error: str
