from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

from config import MAX_IMAGE_BASE64_CHARS


class StudentCreate(BaseModel):
    enrollment: str = Field(..., min_length=1, max_length=50, pattern=r"^[A-Za-z0-9_-]+$")
    name: str = Field(..., min_length=1, max_length=100)
    branch: Optional[str] = Field(default="", max_length=100)
    department: Optional[str] = Field(default="", max_length=100)
    course: Optional[str] = Field(default="B.Tech", max_length=50)
    year: Optional[int] = Field(default=1, ge=1, le=5)
    semester: Optional[int] = Field(default=1, ge=1, le=10)
    admission_year: Optional[int] = Field(default=2026, ge=2000, le=2100)
    pin: Optional[str] = Field(default="1234", min_length=4, max_length=6, pattern=r"^\d{4,6}$", description="Student 4-6 digit login PIN")


class StudentResponse(BaseModel):
    id: int
    enrollment: str
    name: str
    department: str
    branch: str
    course: str
    year: int
    semester: int
    admission_year: int
    status: str
    has_face: bool
    created_at: str


class FaceRegisterRequest(BaseModel):
    images: List[str] = Field(..., max_length=10)
    consent: bool = False

    @field_validator("images", mode="after")
    @classmethod
    def validate_image_sizes(cls, v):
        if v:
            for i, img in enumerate(v):
                if len(img) > MAX_IMAGE_BASE64_CHARS:
                    raise ValueError(f"Image at index {i} exceeds maximum allowed size ({MAX_IMAGE_BASE64_CHARS} chars)")
        return v
