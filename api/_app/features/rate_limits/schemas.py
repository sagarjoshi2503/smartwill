from pydantic import BaseModel


class RateLimitsResponse(BaseModel):
    maxThreadsPerDay: int
    maxCostUsdPerDay: float
    maxTokensPerDay: int
    updatedAt: str | None = None
    updatedBy: str | None = None


class ErrorResponse(BaseModel):
    error: str
