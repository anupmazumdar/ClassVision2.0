from typing import List
from pydantic import BaseModel, Field, field_validator

from config import MAX_IMAGE_BASE64_CHARS


class StudentCreate(BaseModel):
    enrollment: str = Field(..., min_length=1, max_length=50, pattern=r"^[A-Za-z0-9_-]+$")
    name: str = Field(..., min_length=1, max_length=100)
    department: str = Field(default="", max_length=100)


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
