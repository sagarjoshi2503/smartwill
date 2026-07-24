from pydantic import BaseModel


class ContactInfoResponse(BaseModel):
    email: str
    phone: str


class ContactUsResponse(BaseModel):
    sent: bool


class ErrorResponse(BaseModel):
    error: str
