from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

from config import MAX_IMAGE_BASE64_CHARS


class RecognizeRequest(BaseModel):
    image: str = Field(..., max_length=MAX_IMAGE_BASE64_CHARS)
    frames: Optional[List[str]] = Field(default=None, max_length=5)
    session_id: Optional[int] = None
    device_id: Optional[str] = None

    @field_validator("frames", mode="after")
    @classmethod
    def validate_frame_sizes(cls, v):
        if v:
            for i, f in enumerate(v):
                if len(f) > MAX_IMAGE_BASE64_CHARS:
                    raise ValueError(f"Frame at index {i} exceeds maximum allowed size ({MAX_IMAGE_BASE64_CHARS} chars)")
        return v


class ScanAndMarkRequest(BaseModel):
    image: str = Field(..., max_length=MAX_IMAGE_BASE64_CHARS)
    frames: Optional[List[str]] = Field(default=None, max_length=5)
    lat: Optional[float] = None
    lng: Optional[float] = None
    code: Optional[str] = None
    device_id: Optional[str] = None

    @field_validator("frames", mode="after")
    @classmethod
    def validate_frame_sizes(cls, v):
        if v:
            for i, f in enumerate(v):
                if len(f) > MAX_IMAGE_BASE64_CHARS:
                    raise ValueError(f"Frame at index {i} exceeds maximum allowed size ({MAX_IMAGE_BASE64_CHARS} chars)")
        return v


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
