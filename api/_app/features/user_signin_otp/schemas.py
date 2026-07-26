from pydantic import BaseModel


class OtpRequestResponse(BaseModel):
    phone: str
    expiresInSeconds: int


class OtpVerifyResponse(BaseModel):
    phone: str
    email: str
    verified: bool
    token: str


class ErrorResponse(BaseModel):
    error: str
