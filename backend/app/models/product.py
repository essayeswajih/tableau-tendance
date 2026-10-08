from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ProductBase(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    slug: str | None = Field(default=None, min_length=1, max_length=180)
    category: str = Field(min_length=1, max_length=120)
    price: str = Field(min_length=1, max_length=40)
    image: str = Field(min_length=1, max_length=255)
    badge: str | None = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    slug: str | None = Field(default=None, min_length=1, max_length=180)
    category: str | None = Field(default=None, min_length=1, max_length=120)
    price: str | None = Field(default=None, min_length=1, max_length=40)
    image: str | None = Field(default=None, min_length=1, max_length=255)
    badge: str | None = None
    is_active: bool | None = None


class ProductRead(ProductBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
