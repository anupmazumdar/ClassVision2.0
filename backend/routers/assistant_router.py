from typing import Any, Dict, List, Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field

from services import assistant_service

router = APIRouter(prefix="/assistant", tags=["AI Assistant"])


class ChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="User question or prompt")
    history: Optional[List[Dict[str, str]]] = Field(default=None, description="Recent conversation turns")


class ActionLink(BaseModel):
    label: str
    link: str


class ChatMessageResponse(BaseModel):
    reply: str
    suggestions: List[str] = []
    action: Optional[ActionLink] = None
    matched_id: Optional[str] = None


@router.post("/chat", response_model=ChatMessageResponse)
def chat_with_assistant(req: ChatMessageRequest):
    """
    Interacts with the UEM ClassVision AI Assistant for system questions, guidance, and troubleshooting.
    """
    res = assistant_service.answer_assistant_query(req.message, req.history)
    return res


@router.get("/faqs")
def get_faqs():
    """
    Returns categorized FAQs with instant answers.
    """
    return assistant_service.get_all_faqs()
