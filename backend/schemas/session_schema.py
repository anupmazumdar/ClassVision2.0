from typing import Optional
from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    subject: str = Field(..., min_length=1, max_length=120)
    room: str = Field(default="", max_length=100)
    room_lat: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    room_lng: Optional[float] = Field(default=None, ge=-180.0, le=180.0)
    radius_meters: Optional[float] = Field(default=100.0, gt=0, le=50000.0)
    require_code: Optional[bool] = False
