from typing import List
from pydantic import BaseModel, Field


class StudentCreate(BaseModel):
    enrollment: str = Field(..., min_length=1, max_length=50, pattern=r"^[A-Za-z0-9_-]+$")
    name: str = Field(..., min_length=1, max_length=100)
    department: str = Field(default="", max_length=100)


class FaceRegisterRequest(BaseModel):
    images: List[str] = Field(..., max_length=10)
    consent: bool = False
