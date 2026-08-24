from pydantic import BaseModel


class ChatbotFeedbackItem(BaseModel):
    emailid: str
    question: str
    answer: str
    responsedatetime: str | None = None
    notlikedreason: str


class AdminListChatbotFeedbackResponse(BaseModel):
    feedback: list[ChatbotFeedbackItem]


class ErrorResponse(BaseModel):
    error: str
