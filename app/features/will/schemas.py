from pydantic import BaseModel


class SaveWillResponse(BaseModel):
    willId: str
    status: str


class ClientOut(BaseModel):
    willId: str
    name: str
    contact: str
    updatedAt: str | None


class ClientsResponse(BaseModel):
    clients: list[ClientOut]


class ErrorResponse(BaseModel):
    error: str
