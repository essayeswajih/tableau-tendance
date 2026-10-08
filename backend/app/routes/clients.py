import re
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_admin
from app.db import get_db
from app.entities.admin_user import AdminUser
from app.entities.client import ClientMerge
from app.entities.order import Order
from app.entities.reservation import Reservation
from app.models.client import ClientMergeRequest, ClientMergeUpdate, ClientRead

router = APIRouter(prefix="/clients", tags=["clients"])


def normalize_phone(phone: str) -> str:
    normalized = re.sub(r"[^\d+]", "", phone.strip())
    if normalized.startswith("00"):
        normalized = f"+{normalized[2:]}"
    return normalized


def unique_sorted(values: list[str]) -> list[str]:
    return sorted({value for value in values if value})


@router.get("", response_model=list[ClientRead])
async def list_clients(
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> list[dict[str, Any]]:
    reservations = list((await db.execute(select(Reservation))).scalars().all())
    orders = list((await db.execute(select(Order))).scalars().all())
    merges = list((await db.execute(select(ClientMerge))).scalars().all())

    phone_to_merge: dict[str, ClientMerge] = {}
    for merge in merges:
        for phone in merge.phones:
            phone_to_merge[normalize_phone(phone)] = merge

    grouped: dict[str, dict[str, Any]] = {}

    def ensure_group(phone: str, name: str) -> dict[str, Any]:
        normalized_phone = normalize_phone(phone)
        merge = phone_to_merge.get(normalized_phone)
        group_key = f"merge-{merge.id}" if merge else f"phone-{normalized_phone}"
        if group_key not in grouped:
            grouped[group_key] = {
                "id": group_key,
                "merge_id": merge.id if merge else None,
                "display_name": (merge.display_name if merge else None) or name,
                "phones": list(merge.phones) if merge else [normalized_phone],
                "raw_phones": [],
                "addresses": [],
                "reservations_count": 0,
                "orders_count": 0,
                "total_spent": 0,
                "last_activity": None,
                "services": [],
                "products": [],
                "reservations": [],
                "orders": [],
                "notes": merge.notes if merge else None,
            }
        group = grouped[group_key]
        group["raw_phones"].append(phone)
        if normalized_phone not in group["phones"]:
            group["phones"].append(normalized_phone)
        if not group["display_name"]:
            group["display_name"] = name
        return group

    def update_last_activity(group: dict[str, Any], date: datetime | None) -> None:
        if date is None:
            return
        current = group["last_activity"]
        comparable_date = date.replace(tzinfo=None)
        comparable_current = current.replace(tzinfo=None) if current else None
        if comparable_current is None or comparable_date > comparable_current:
            group["last_activity"] = date

    for reservation in reservations:
        group = ensure_group(reservation.customer_phone, reservation.customer_name)
        group["reservations_count"] += 1
        group["services"].append(reservation.service)
        group["reservations"].append(
            {
                "id": reservation.id,
                "service": reservation.service,
                "status": reservation.status,
                "reservation_time": reservation.reservation_time,
            }
        )
        update_last_activity(group, reservation.created_at)
        update_last_activity(group, reservation.reservation_time)

    for order in orders:
        group = ensure_group(order.customer_phone, order.customer_name)
        group["orders_count"] += 1
        group["total_spent"] += order.total
        group["addresses"].append(order.delivery_address)
        for item in order.items:
            title = item.get("title") if isinstance(item, dict) else None
            if title:
                group["products"].append(str(title))
        group["orders"].append(
            {
                "id": order.id,
                "status": order.status,
                "total": order.total,
                "delivery_address": order.delivery_address,
                "created_at": order.created_at,
            }
        )
        update_last_activity(group, order.created_at)

    clients = []
    for group in grouped.values():
        group["phones"] = unique_sorted(group["phones"])
        group["raw_phones"] = unique_sorted(group["raw_phones"])
        group["addresses"] = unique_sorted(group["addresses"])
        group["services"] = unique_sorted(group["services"])
        group["products"] = unique_sorted(group["products"])
        clients.append(group)

    return sorted(
        clients,
        key=lambda client: client["last_activity"] or datetime.min,
        reverse=True,
    )


@router.post("/merge", response_model=list[ClientRead], status_code=status.HTTP_201_CREATED)
async def merge_clients(
    payload: ClientMergeRequest,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> list[dict[str, Any]]:
    normalized_phones = unique_sorted([normalize_phone(phone) for phone in payload.phones])
    if len(normalized_phones) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least two different phone numbers are required",
        )

    existing_merges = list((await db.execute(select(ClientMerge))).scalars().all())
    matching_merges = [
        merge
        for merge in existing_merges
        if set(normalize_phone(phone) for phone in merge.phones).intersection(normalized_phones)
    ]

    if matching_merges:
        target = matching_merges[0]
        merged_phones = set(normalize_phone(phone) for phone in target.phones)
        for merge in matching_merges:
            merged_phones.update(normalize_phone(phone) for phone in merge.phones)
            if merge.id != target.id:
                await db.delete(merge)
        merged_phones.update(normalized_phones)
        target.phones = sorted(merged_phones)
        if payload.display_name:
            target.display_name = payload.display_name
        if payload.notes is not None:
            target.notes = payload.notes
    else:
        db.add(
            ClientMerge(
                phones=normalized_phones,
                display_name=payload.display_name,
                notes=payload.notes,
            )
        )

    await db.commit()
    return await list_clients(db, admin)


@router.patch("/merges/{merge_id}", response_model=list[ClientRead])
async def update_client_merge(
    merge_id: int,
    payload: ClientMergeUpdate,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> list[dict[str, Any]]:
    merge = await db.get(ClientMerge, merge_id)
    if merge is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client merge not found")

    if payload.display_name is not None:
        merge.display_name = payload.display_name
    if payload.notes is not None:
        merge.notes = payload.notes
    await db.commit()
    return await list_clients(db, admin)


@router.delete("/merges/{merge_id}", response_model=list[ClientRead])
async def delete_client_merge(
    merge_id: int,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> list[dict[str, Any]]:
    merge = await db.get(ClientMerge, merge_id)
    if merge is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client merge not found")

    await db.delete(merge)
    await db.commit()
    return await list_clients(db, admin)
