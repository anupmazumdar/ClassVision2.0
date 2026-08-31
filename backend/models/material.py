from sqlalchemy import Column, DateTime, Integer, String, Text

from utils.time import utc_now
from .base import Base


class ClassroomMaterial(Base):
    __tablename__ = "classroom_materials"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    material_type = Column(String, nullable=False, default="note")  # note, pdf, assignment, test, announcement
    subject = Column(String, nullable=False, default="General", index=True)
    course = Column(String, default="All")  # B.Tech, BCA, All
    branch = Column(String, default="All")  # CSE, ECE, All
    year = Column(String, default="All")  # 1st Year, 2nd Year, All
    description = Column(Text, default="")
    attachment_url = Column(String, nullable=True)  # URL or File link
    attachment_name = Column(String, nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)  # For assignments / tests
    total_marks = Column(Integer, nullable=True)  # For tests / assignments
    whatsapp_group_link = Column(String, nullable=True)  # Optional class WhatsApp invite link
    teacher_name = Column(String, default="Teacher")
    teacher_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
