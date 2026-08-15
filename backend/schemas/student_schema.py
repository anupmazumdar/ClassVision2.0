from typing import List

from pydantic import BaseModel


class StudentCreate(BaseModel):
    enrollment: str
    name: str
    department: str = ""


class FaceRegisterRequest(BaseModel):
    images: List[str]
