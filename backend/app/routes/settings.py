from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_admin
from app.db import get_db
from app.entities.admin_user import AdminUser
from app.entities.settings import AppSettings
from app.models.settings import SiteSettings

SETTINGS_KEY = "site"
LEGACY_BRAND_TOKEN = "hair" + "corner"
LEGACY_CONTACT_EMAIL = f"contact@{LEGACY_BRAND_TOKEN}.tn"
LEGACY_IMAGE_PREFIX = "/uploads/" + "site" + "-image-"

DEFAULT_SETTINGS: dict[str, object] = {
    "salon_info": {
        "salon_name": "Tableau Tendance",
        "phone": "+216 00 000 000",
        "whatsapp": "+216 00 000 000",
        "address": "Tunis, Tunisie",
        "email": "contact@tableau-tendance.tn",
        "instagram": "https://instagram.com/tableautendance",
        "facebook": "https://facebook.com/tableautendance",
    },
    "opening_hours": [
        {"day": "Lundi", "is_open": True, "opens_at": "09:00", "closes_at": "18:00"},
        {"day": "Mardi", "is_open": True, "opens_at": "09:00", "closes_at": "18:00"},
        {"day": "Mercredi", "is_open": True, "opens_at": "09:00", "closes_at": "18:00"},
        {"day": "Jeudi", "is_open": True, "opens_at": "09:00", "closes_at": "18:00"},
        {"day": "Vendredi", "is_open": True, "opens_at": "09:00", "closes_at": "18:00"},
        {"day": "Samedi", "is_open": True, "opens_at": "09:00", "closes_at": "18:00"},
        {"day": "Dimanche", "is_open": False, "opens_at": "09:00", "closes_at": "18:00"},
    ],
    "reservation": {
        "reservations_enabled": True,
        "slot_duration_minutes": 30,
        "max_reservations_per_slot": 1,
        "min_advance_hours": 2,
        "confirmation_message": "Votre demande a ete envoyee. Nous vous contacterons pour confirmer le livraison.",
    },
    "boutique": {
        "orders_enabled": True,
        "delivery_fee": 7,
        "free_delivery_threshold": 150,
        "default_order_status": "nouvelle",
        "currency": "DT",
        "payment_note": "Paiement a la livraison.",
    },
    "dashboard": {
        "default_dashboard_tab": "reservations",
        "items_per_page": 10,
        "show_stats_cards": True,
    },
    "branding": {
        "logo_url": "/uploads/tableau-tendance-logo.png",
        "primary_color": "#c89b4b",
        "hero_image_url": "/uploads/tableau-hero.png",
        "short_description": "Tableaux decoratifs modernes avec livraison partout en Tunisie.",
    },
}

router = APIRouter(prefix="/settings", tags=["settings"])


def normalize_settings(value: dict[str, object]) -> dict[str, object]:
    normalized = {**DEFAULT_SETTINGS, **value}

    if "salon_info" not in normalized and "boutique_info" in normalized:
        boutique_info = dict(normalized["boutique_info"])
        boutique_info["salon_name"] = boutique_info.pop("boutique_name", "Tableau Tendance")
        normalized["salon_info"] = boutique_info

    normalized.pop("boutique_info", None)

    salon_info = dict(normalized["salon_info"])
    salon_info.setdefault("salon_name", "Tableau Tendance")
    if salon_info.get("email") == LEGACY_CONTACT_EMAIL:
        salon_info["email"] = "contact@tableau-tendance.tn"
    if LEGACY_BRAND_TOKEN in str(salon_info.get("instagram", "")):
        salon_info["instagram"] = "https://instagram.com/tableautendance"
    if LEGACY_BRAND_TOKEN in str(salon_info.get("facebook", "")):
        salon_info["facebook"] = "https://facebook.com/tableautendance"
    normalized["salon_info"] = salon_info

    branding = dict(normalized["branding"])
    branding["logo_url"] = "/uploads/tableau-tendance-logo.png"
    branding["primary_color"] = "#c89b4b"
    if str(branding.get("hero_image_url", "")).startswith(LEGACY_IMAGE_PREFIX):
        branding["hero_image_url"] = "/uploads/tableau-hero.png"
    normalized["branding"] = branding

    return normalized


async def get_or_create_settings(db: AsyncSession) -> AppSettings:
    settings = await db.get(AppSettings, SETTINGS_KEY)
    if settings is None:
        settings = AppSettings(key=SETTINGS_KEY, value=DEFAULT_SETTINGS)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    else:
        normalized = normalize_settings(settings.value)
        if normalized != settings.value:
            settings.value = normalized
            await db.commit()
            await db.refresh(settings)
    return settings


@router.get("", response_model=SiteSettings)
async def read_settings(db: AsyncSession = Depends(get_db)) -> dict[str, object]:
    settings = await get_or_create_settings(db)
    return normalize_settings(settings.value)


@router.put("", response_model=SiteSettings)
async def update_settings(
    payload: SiteSettings,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> dict[str, object]:
    settings = await get_or_create_settings(db)
    settings.value = payload.model_dump(mode="json")
    await db.commit()
    await db.refresh(settings)
    return settings.value

