from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

MessageStatus = Literal["nouveau", "lu", "repondu", "archive"]


class ContactMessageBase(BaseModel):
    customer_name: str = Field(min_length=2, max_length=160)
    customer_phone: str = Field(min_length=6, max_length=40)
    customer_email: str | None = Field(default=None, max_length=160)
    subject: str = Field(min_length=1, max_length=120)
    message: str = Field(min_length=5, max_length=2000)


class ContactMessageCreate(ContactMessageBase):
    pass


class ContactMessageStatusUpdate(BaseModel):
    status: MessageStatus


class ContactMessageRead(ContactMessageBase):
    id: int
    status: MessageStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
