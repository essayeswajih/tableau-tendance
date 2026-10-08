from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ServiceBase(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    description: str = Field(min_length=1)
    duration: str = Field(min_length=1, max_length=60)
    price: str = Field(min_length=1, max_length=80)
    image: str = Field(min_length=1, max_length=255)
    category: str = Field(min_length=1, max_length=80)


class ServiceCreate(ServiceBase):
    pass


class ServiceUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = Field(default=None, min_length=1)
    duration: str | None = Field(default=None, min_length=1, max_length=60)
    price: str | None = Field(default=None, min_length=1, max_length=80)
    image: str | None = Field(default=None, min_length=1, max_length=255)
    category: str | None = Field(default=None, min_length=1, max_length=80)
    is_active: bool | None = None


class ServiceRead(ServiceBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
