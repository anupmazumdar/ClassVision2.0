import re
from typing import Literal
from pydantic import BaseModel, Field, field_validator


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1, max_length=255)

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r"^[^@\s]+@[^@\s]+", v):
            raise ValueError("Invalid email format")
        return v


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=8, max_length=255)
    role: Literal["admin", "teacher"] = "teacher"

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r"^[^@\s]+@[^@\s]+", v):
            raise ValueError("Invalid email format")
        return v


class StudentLoginRequest(BaseModel):
    enrollment: str = Field(..., min_length=1, max_length=100)
    pin: str = Field(..., min_length=4, max_length=6, pattern=r"^\d{4,6}$", description="4-6 digit second-factor security PIN")
    device_id: str = Field(..., min_length=1, max_length=255)
    device_info: str = Field(default="Web/Mobile Browser", max_length=255)

