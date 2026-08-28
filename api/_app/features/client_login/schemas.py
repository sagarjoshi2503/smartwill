from pydantic import BaseModel


class LogoutResponse(BaseModel):
    loggedOut: bool


class ErrorResponse(BaseModel):
    error: str
