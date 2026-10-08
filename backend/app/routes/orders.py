from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_admin
from app.db import get_db
from app.entities.admin_user import AdminUser
from app.entities.order import Order
from app.entities.product import Product
from app.models.order import OrderCreate, OrderRead, OrderStatusUpdate
from app.routes.settings import get_or_create_settings

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("", response_model=list[OrderRead])
async def list_orders(
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> list[Order]:
    result = await db.execute(select(Order).order_by(Order.created_at.desc()))
    return list(result.scalars().all())


@router.post("", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: OrderCreate,
    db: AsyncSession = Depends(get_db),
) -> Order:
    settings = await get_or_create_settings(db)
    boutique_settings = settings.value["boutique"]
    if not boutique_settings["orders_enabled"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Online orders are disabled",
        )

    requested_titles = {item.title for item in payload.items}
    result = await db.execute(
        select(Product).where(Product.title.in_(requested_titles), Product.is_active.is_(True))
    )
    products_by_title = {product.title: product for product in result.scalars().all()}
    missing_products = requested_titles - set(products_by_title)
    if missing_products:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order contains unavailable products",
        )

    normalized_items = []
    calculated_subtotal = 0
    for item in payload.items:
        product = products_by_title[item.title]
        unit_price = parse_price(product.price)
        calculated_subtotal += unit_price * item.quantity
        normalized_items.append(
            {
                "title": product.title,
                "category": product.category,
                "image": product.image,
                "unitPrice": unit_price,
                "quantity": item.quantity,
            }
        )

    configured_delivery_fee = int(boutique_settings["delivery_fee"])
    free_delivery_threshold = int(boutique_settings["free_delivery_threshold"])
    calculated_delivery_fee = (
        0
        if free_delivery_threshold > 0 and calculated_subtotal >= free_delivery_threshold
        else configured_delivery_fee
    )
    calculated_total = calculated_subtotal + calculated_delivery_fee
    order_data = payload.model_dump(mode="json")
    order_data["items"] = normalized_items
    order_data["subtotal"] = calculated_subtotal
    order_data["delivery_fee"] = calculated_delivery_fee
    order_data["total"] = calculated_total
    order = Order(**order_data)
    order.status = str(boutique_settings["default_order_status"])
    db.add(order)
    await db.commit()
    await db.refresh(order)
    return order


def parse_price(price: str) -> int:
    digits = "".join(character for character in price if character.isdigit())
    return int(digits or 0)


@router.patch("/{order_id}/status", response_model=OrderRead)
async def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> Order:
    order = await db.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    order.status = payload.status
    await db.commit()
    await db.refresh(order)
    return order
