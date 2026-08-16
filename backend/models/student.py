from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String

from utils.crypto import EncryptedText
from .base import Base


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    enrollment = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    department = Column(String, default="")
    face_encodings = Column(EncryptedText, default="[]")
    device_id = Column(String, nullable=True)  # Bound device identifier
    consent_given = Column(Boolean, default=False, nullable=False)  # Biometric GDPR/Consent Flag
    consent_at = Column(DateTime, nullable=True)  # Consent grant timestamp
    created_at = Column(DateTime, default=datetime.utcnow)
