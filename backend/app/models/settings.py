from typing import Literal

from pydantic import BaseModel, Field

OrderStatus = Literal["nouvelle", "confirmee", "en_preparation", "livree", "annulee"]


class SalonInfoSettings(BaseModel):
    salon_name: str = Field(min_length=1, max_length=120)
    phone: str = Field(max_length=40)
    whatsapp: str = Field(max_length=40)
    address: str = Field(max_length=255)
    email: str = Field(max_length=160)
    instagram: str = Field(max_length=255)
    facebook: str = Field(max_length=255)


class OpeningHourSettings(BaseModel):
    day: str = Field(min_length=1, max_length=20)
    is_open: bool
    opens_at: str = Field(pattern=r"^\d{2}:\d{2}$")
    closes_at: str = Field(pattern=r"^\d{2}:\d{2}$")


class ReservationSettings(BaseModel):
    reservations_enabled: bool
    slot_duration_minutes: int = Field(ge=5, le=240)
    max_reservations_per_slot: int = Field(ge=1, le=50)
    min_advance_hours: int = Field(ge=0, le=720)
    confirmation_message: str = Field(max_length=500)


class BoutiqueSettings(BaseModel):
    orders_enabled: bool
    delivery_fee: int = Field(ge=0)
    free_delivery_threshold: int = Field(ge=0)
    default_order_status: OrderStatus
    currency: str = Field(min_length=1, max_length=12)
    payment_note: str = Field(max_length=500)


class DashboardPreferencesSettings(BaseModel):
    default_dashboard_tab: str = Field(min_length=1, max_length=40)
    items_per_page: int = Field(ge=5, le=100)
    show_stats_cards: bool


class BrandingSettings(BaseModel):
    logo_url: str = Field(max_length=255)
    primary_color: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    hero_image_url: str = Field(max_length=255)
    short_description: str = Field(max_length=500)


class SiteSettings(BaseModel):
    salon_info: SalonInfoSettings
    opening_hours: list[OpeningHourSettings] = Field(min_length=1)
    reservation: ReservationSettings
    boutique: BoutiqueSettings
    dashboard: DashboardPreferencesSettings
    branding: BrandingSettings
