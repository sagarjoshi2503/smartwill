from pydantic import BaseModel


class OtpRequestResponse(BaseModel):
    phone: str
    expiresInSeconds: int


class OtpVerifyResponse(BaseModel):
    phone: str
    verified: bool


class ErrorResponse(BaseModel):
    error: str
