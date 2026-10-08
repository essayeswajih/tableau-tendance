from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_admin
from app.db import get_db
from app.entities.admin_user import AdminUser
from app.entities.reservation import Reservation
from app.models.reservation import (
    ReservationCreate,
    ReservationRead,
    ReservationStatusUpdate,
    ReservationUpdate,
)
from app.rate_limit import rate_limit
from app.routes.settings import get_or_create_settings

router = APIRouter(prefix="/reservations", tags=["reservations"])


@router.get("", response_model=list[ReservationRead])
async def list_reservations(
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> list[Reservation]:
    result = await db.execute(select(Reservation).order_by(Reservation.reservation_time))
    return list(result.scalars().all())


@router.post(
    "",
    response_model=ReservationRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit(limit=8, window_seconds=60, scope="reservation-create"))],
)
async def create_reservation(
    payload: ReservationCreate,
    db: AsyncSession = Depends(get_db),
) -> Reservation:
    settings = await get_or_create_settings(db)
    reservation_settings = settings.value["reservation"]
    if not reservation_settings["reservations_enabled"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Online reservations are disabled",
        )

    reservation = Reservation(**payload.model_dump())
    db.add(reservation)
    await db.commit()
    await db.refresh(reservation)
    return reservation


@router.get("/{reservation_id}", response_model=ReservationRead)
async def get_reservation(
    reservation_id: int,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> Reservation:
    reservation = await db.get(Reservation, reservation_id)
    if reservation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")
    return reservation


@router.patch("/{reservation_id}", response_model=ReservationRead)
async def update_reservation(
    reservation_id: int,
    payload: ReservationUpdate,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> Reservation:
    reservation = await db.get(Reservation, reservation_id)
    if reservation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(reservation, field, value)

    await db.commit()
    await db.refresh(reservation)
    return reservation


@router.patch("/{reservation_id}/status", response_model=ReservationRead)
async def update_reservation_status(
    reservation_id: int,
    payload: ReservationStatusUpdate,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> Reservation:
    reservation = await db.get(Reservation, reservation_id)
    if reservation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")

    reservation.status = payload.status
    await db.commit()
    await db.refresh(reservation)
    return reservation


@router.delete("/{reservation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reservation(
    reservation_id: int,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> None:
    reservation = await db.get(Reservation, reservation_id)
    if reservation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")

    await db.delete(reservation)
    await db.commit()
