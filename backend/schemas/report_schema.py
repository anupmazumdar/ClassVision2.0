from pydantic import BaseModel


class EmailRequest(BaseModel):
    to: str
