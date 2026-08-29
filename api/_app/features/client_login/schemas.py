from pydantic import BaseModel


class LogoutResponse(BaseModel):
    loggedOut: bool


class ProfileResponse(BaseModel):
    email: str
    mobileNumber: str | None


class MobileChangeRequestResponse(BaseModel):
    mobileNumber: str
    expiresInSeconds: int


class MobileChangeVerifyResponse(BaseModel):
    mobileNumber: str
    verified: bool


class ErrorResponse(BaseModel):
    error: str
