from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import re
import unicodedata

from app.auth import get_current_admin
from app.db import get_db
from app.entities.admin_user import AdminUser
from app.entities.product import Product
from app.models.product import ProductCreate, ProductRead, ProductUpdate

router = APIRouter(prefix="/products", tags=["products"])


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-")
    slug = slug.removeprefix("tableau-")
    return f"tableau-{slug or 'article'}"


async def ensure_unique_slug(db: AsyncSession, slug: str, product_id: int | None = None) -> str:
    base_slug = slug
    candidate = base_slug
    suffix = 1

    while True:
        query = select(Product).where(Product.slug == candidate)
        if product_id is not None:
            query = query.where(Product.id != product_id)
        existing = (await db.execute(query)).scalar_one_or_none()
        if existing is None:
            return candidate
        candidate = f"{base_slug}-{suffix}"
        suffix += 1


@router.get("", response_model=list[ProductRead])
async def list_products(db: AsyncSession = Depends(get_db)) -> list[Product]:
    result = await db.execute(
        select(Product).where(Product.is_active.is_(True)).order_by(Product.id)
    )
    return list(result.scalars().all())


@router.get("/admin", response_model=list[ProductRead])
async def list_admin_products(
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> list[Product]:
    result = await db.execute(select(Product).order_by(Product.id))
    return list(result.scalars().all())


@router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> Product:
    product_data = payload.model_dump()
    product_data["slug"] = await ensure_unique_slug(
        db,
        slugify(product_data.get("slug") or product_data["title"]),
    )
    product = Product(**product_data)
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product


@router.patch("/{product_id}", response_model=ProductRead)
async def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> Product:
    product = await db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    product_data = payload.model_dump(exclude_unset=True)
    if "slug" in product_data or "title" in product_data:
        product_data["slug"] = await ensure_unique_slug(
            db,
            slugify(product_data.get("slug") or product_data.get("title") or product.title),
            product.id,
        )

    for field, value in product_data.items():
        setattr(product, field, value)

    await db.commit()
    await db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> None:
    product = await db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    await db.delete(product)
    await db.commit()
