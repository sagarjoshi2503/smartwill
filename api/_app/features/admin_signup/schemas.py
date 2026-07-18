from pydantic import BaseModel


class AuthResponse(BaseModel):
    name: str
    email: str


class ErrorResponse(BaseModel):
    error: str
