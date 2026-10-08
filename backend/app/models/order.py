from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

OrderStatus = Literal["nouvelle", "confirmee", "en_preparation", "livree", "annulee"]


class OrderItem(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    category: str = Field(min_length=1, max_length=120)
    image: str = Field(min_length=1, max_length=255)
    unitPrice: int = Field(ge=0)
    quantity: int = Field(ge=1)


class OrderBase(BaseModel):
    customer_name: str = Field(min_length=2, max_length=160)
    customer_phone: str = Field(min_length=6, max_length=40)
    delivery_address: str = Field(min_length=5, max_length=255)
    items: list[OrderItem] = Field(min_length=1)
    subtotal: int = Field(ge=0)
    delivery_fee: int = Field(ge=0)
    total: int = Field(ge=0)
    notes: str | None = Field(default=None, max_length=500)


class OrderCreate(OrderBase):
    pass


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class OrderRead(OrderBase):
    id: int
    status: OrderStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
