from pydantic import BaseModel


class OtpRequestResponse(BaseModel):
    phone: str
    expiresInSeconds: int


class OtpVerifyResponse(BaseModel):
    """Phone OTP verified — no token yet. The email second factor (see
    EmailOtpVerifyResponse) still has to pass before a session is issued."""
    phone: str
    email: str
    verified: bool
    expiresInSeconds: int


class EmailOtpVerifyResponse(BaseModel):
    phone: str
    email: str
    verified: bool
    token: str


class ErrorResponse(BaseModel):
    error: str
