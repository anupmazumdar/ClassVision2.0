from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String

from .base import Base


class ClassSession(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, nullable=False)
    room = Column(String, default="")
    teacher_id = Column(Integer, ForeignKey("users.id"))
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)

    # Security & Geofencing fields
    room_lat = Column(Float, nullable=True)
    room_lng = Column(Float, nullable=True)
    radius_meters = Column(Float, default=100.0)
    require_code = Column(Boolean, default=False)
