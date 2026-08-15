from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text

from .base import Base


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    enrollment = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    department = Column(String, default="")
    face_encodings = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)
