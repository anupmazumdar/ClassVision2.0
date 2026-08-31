from typing import List, Optional
from pydantic import BaseModel, Field


class RecognizeRequest(BaseModel):
    image: str
    frames: Optional[List[str]] = Field(default=None, max_length=5)
    session_id: Optional[int] = None
    device_id: Optional[str] = None


class ScanAndMarkRequest(BaseModel):
    image: str
    frames: Optional[List[str]] = Field(default=None, max_length=5)
    lat: Optional[float] = None
    lng: Optional[float] = None
    code: Optional[str] = None
    device_id: Optional[str] = None


class MarkRequest(BaseModel):
    student_id: int
    attendance_ticket: Optional[str] = None
    confidence: float = 0.0
    lat: Optional[float] = None
    lng: Optional[float] = None
    code: Optional[str] = None
    device_id: Optional[str] = None


class ManualMarkRequest(BaseModel):
    student_id: int
