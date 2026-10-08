from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ReservationStatus = Literal["en_attente", "confirme", "annulee", "autre_horaire"]


class ReservationBase(BaseModel):
    customer_name: str = Field(min_length=1, max_length=120)
    customer_phone: str = Field(min_length=1, max_length=40)
    service: str = Field(min_length=1, max_length=120)
    reservation_time: datetime
    notes: str | None = None


class ReservationCreate(ReservationBase):
    pass


class ReservationUpdate(BaseModel):
    customer_name: str | None = Field(default=None, min_length=1, max_length=120)
    customer_phone: str | None = Field(default=None, min_length=1, max_length=40)
    service: str | None = Field(default=None, min_length=1, max_length=120)
    reservation_time: datetime | None = None
    notes: str | None = None


class ReservationStatusUpdate(BaseModel):
    status: ReservationStatus


class ReservationRead(ReservationBase):
    id: int
    status: ReservationStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
