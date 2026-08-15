from pydantic import BaseModel


class RecognizeRequest(BaseModel):
    image: str


class MarkRequest(BaseModel):
    student_id: int
    confidence: float = 0.0
