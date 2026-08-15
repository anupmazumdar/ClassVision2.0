from typing import Optional

from pydantic import BaseModel


class SessionCreate(BaseModel):
    subject: str
    room: str = ""
    room_lat: Optional[float] = None
    room_lng: Optional[float] = None
    radius_meters: Optional[float] = 100.0
    require_code: Optional[bool] = False
