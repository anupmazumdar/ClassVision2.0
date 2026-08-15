from typing import List, Optional

from pydantic import BaseModel


class RecognizeRequest(BaseModel):
    image: str
    frames: Optional[List[str]] = None


class MarkRequest(BaseModel):
    student_id: int
    confidence: float = 0.0
    lat: Optional[float] = None
    lng: Optional[float] = None
    code: Optional[str] = None
    device_id: Optional[str] = None
    frames: Optional[List[str]] = None
