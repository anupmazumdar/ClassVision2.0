from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class MaterialCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    material_type: str = Field(default="note", pattern="^(note|pdf|assignment|test|announcement)$")
    subject: str = Field(default="General", max_length=100)
    course: Optional[str] = Field(default="All", max_length=50)
    branch: Optional[str] = Field(default="All", max_length=100)
    year: Optional[str] = Field(default="All", max_length=50)
    description: Optional[str] = Field(default="", max_length=5000)
    attachment_url: Optional[str] = Field(default=None, max_length=2048)
    attachment_name: Optional[str] = Field(default=None, max_length=255)
    due_date: Optional[datetime] = Field(default=None)
    total_marks: Optional[int] = Field(default=None, ge=0)
    whatsapp_group_link: Optional[str] = Field(default=None, max_length=2048)


class MaterialUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    material_type: Optional[str] = Field(default=None, pattern="^(note|pdf|assignment|test|announcement)$")
    subject: Optional[str] = Field(default=None, max_length=100)
    course: Optional[str] = Field(default=None, max_length=50)
    branch: Optional[str] = Field(default=None, max_length=100)
    year: Optional[str] = Field(default=None, max_length=50)
    description: Optional[str] = Field(default=None, max_length=5000)
    attachment_url: Optional[str] = Field(default=None, max_length=2048)
    attachment_name: Optional[str] = Field(default=None, max_length=255)
    due_date: Optional[datetime] = Field(default=None)
    total_marks: Optional[int] = Field(default=None, ge=0)
    whatsapp_group_link: Optional[str] = Field(default=None, max_length=2048)


class MaterialResponse(BaseModel):
    id: int
    title: str
    material_type: str
    subject: str
    course: str
    branch: str
    year: str
    description: str
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
    due_date: Optional[str] = None
    total_marks: Optional[int] = None
    whatsapp_group_link: Optional[str] = None
    teacher_name: str
    teacher_id: Optional[int] = None
    created_at: str
    updated_at: str
