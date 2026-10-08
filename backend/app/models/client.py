from datetime import datetime

from pydantic import BaseModel, Field


class ClientReservationSummary(BaseModel):
    id: int
    service: str
    status: str
    reservation_time: datetime


class ClientOrderSummary(BaseModel):
    id: int
    status: str
    total: int
    delivery_address: str
    created_at: datetime


class ClientRead(BaseModel):
    id: str
    merge_id: int | None
    display_name: str
    phones: list[str]
    raw_phones: list[str]
    addresses: list[str]
    reservations_count: int
    orders_count: int
    total_spent: int
    last_activity: datetime | None
    services: list[str]
    products: list[str]
    reservations: list[ClientReservationSummary]
    orders: list[ClientOrderSummary]
    notes: str | None = None


class ClientMergeRequest(BaseModel):
    phones: list[str] = Field(min_length=2)
    display_name: str | None = Field(default=None, max_length=160)
    notes: str | None = Field(default=None, max_length=500)


class ClientMergeUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=160)
    notes: str | None = Field(default=None, max_length=500)
