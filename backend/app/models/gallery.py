from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class GalleryImageBase(BaseModel):
    src: str = Field(min_length=1, max_length=255)
    alt: str = Field(min_length=1, max_length=255)
    category: str = Field(min_length=1, max_length=80)
    caption: str = Field(min_length=1, max_length=255)
    display_order: int = Field(default=0, ge=0)


class GalleryImageCreate(GalleryImageBase):
    pass


class GalleryImageUpdate(BaseModel):
    src: str | None = Field(default=None, min_length=1, max_length=255)
    alt: str | None = Field(default=None, min_length=1, max_length=255)
    category: str | None = Field(default=None, min_length=1, max_length=80)
    caption: str | None = Field(default=None, min_length=1, max_length=255)
    display_order: int | None = Field(default=None, ge=0)
    is_active: bool | None = None


class GalleryImageRead(GalleryImageBase):
    id: int
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
