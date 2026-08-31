from typing import Optional
from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    subject: str = Field(..., min_length=1, max_length=120)
    room: str = Field(default="", max_length=100)
    room_lat: Optional[float] = None
    room_lng: Optional[float] = None
    radius_meters: Optional[float] = Field(default=100.0, gt=0, le=1000)
    require_code: Optional[bool] = False
