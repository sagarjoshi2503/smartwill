from pydantic import BaseModel


class AiUsageItem(BaseModel):
    emailid: str
    threadid: str
    role: str
    modelname: str
    inputtokens: int
    outputtokens: int
    requests: int
    cost: float
    createddate: str | None = None
    updateddate: str | None = None


class AdminListAiUsageResponse(BaseModel):
    aiUsage: list[AiUsageItem]


class ErrorResponse(BaseModel):
    error: str
