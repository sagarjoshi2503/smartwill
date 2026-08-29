from pydantic import BaseModel


class AuthResponse(BaseModel):
    name: str
    email: str
    token: str


class ErrorResponse(BaseModel):
    error: str
