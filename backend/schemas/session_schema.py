from pydantic import BaseModel


class SessionCreate(BaseModel):
    subject: str
    room: str = ""
