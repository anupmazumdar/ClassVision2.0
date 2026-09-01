from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

from config import MAX_IMAGE_BASE64_CHARS


class RecognizeRequest(BaseModel):
    image: str = Field(..., min_length=1, max_length=MAX_IMAGE_BASE64_CHARS)
    frames: Optional[List[str]] = Field(default=None, max_length=5)
    session_id: Optional[int] = Field(default=None, ge=1)
    device_id: Optional[str] = Field(default=None, min_length=1, max_length=255)

    @field_validator("frames", mode="after")
    @classmethod
    def validate_frame_sizes(cls, v):
        if v:
            for i, f in enumerate(v):
                if len(f) > MAX_IMAGE_BASE64_CHARS:
                    raise ValueError(f"Frame at index {i} exceeds maximum allowed size ({MAX_IMAGE_BASE64_CHARS} chars)")
        return v


class ScanAndMarkRequest(BaseModel):
    image: str = Field(..., min_length=1, max_length=MAX_IMAGE_BASE64_CHARS)
    frames: Optional[List[str]] = Field(default=None, max_length=5)
    lat: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    lng: Optional[float] = Field(default=None, ge=-180.0, le=180.0)
    code: Optional[str] = Field(default=None, max_length=10)
    device_id: Optional[str] = Field(default=None, min_length=1, max_length=255)

    @field_validator("frames", mode="after")
    @classmethod
    def validate_frame_sizes(cls, v):
        if v:
            for i, f in enumerate(v):
                if len(f) > MAX_IMAGE_BASE64_CHARS:
                    raise ValueError(f"Frame at index {i} exceeds maximum allowed size ({MAX_IMAGE_BASE64_CHARS} chars)")
        return v


class MarkRequest(BaseModel):
    student_id: int = Field(..., ge=1)
    attendance_ticket: Optional[str] = Field(default=None, max_length=500)
    confidence: float = Field(default=0.0, ge=0.0, le=100.0)
    lat: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    lng: Optional[float] = Field(default=None, ge=-180.0, le=180.0)
    code: Optional[str] = Field(default=None, max_length=10)
    device_id: Optional[str] = Field(default=None, min_length=1, max_length=255)


class ManualMarkRequest(BaseModel):
    student_id: int = Field(..., ge=1)


class SelfCheckinRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=10, pattern=r"^[0-9A-Za-z]{6,10}$")
    image: Optional[str] = Field(default=None, max_length=MAX_IMAGE_BASE64_CHARS)
    frames: Optional[List[str]] = Field(default=None, max_length=5)
    lat: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    lng: Optional[float] = Field(default=None, ge=-180.0, le=180.0)
    device_id: Optional[str] = Field(default=None, min_length=1, max_length=255)

    @field_validator("frames", mode="after")
    @classmethod
    def validate_frame_sizes(cls, v):
        if v:
            for i, f in enumerate(v):
                if len(f) > MAX_IMAGE_BASE64_CHARS:
                    raise ValueError(f"Frame at index {i} exceeds maximum allowed size ({MAX_IMAGE_BASE64_CHARS} chars)")
        return v

