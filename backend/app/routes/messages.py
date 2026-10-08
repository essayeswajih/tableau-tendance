from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_admin
from app.db import get_db
from app.entities.admin_user import AdminUser
from app.entities.message import ContactMessage
from app.models.message import (
    ContactMessageCreate,
    ContactMessageRead,
    ContactMessageStatusUpdate,
)
from app.rate_limit import rate_limit

router = APIRouter(prefix="/messages", tags=["messages"])


@router.get("", response_model=list[ContactMessageRead])
async def list_messages(
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> list[ContactMessage]:
    result = await db.execute(select(ContactMessage).order_by(ContactMessage.created_at.desc()))
    return list(result.scalars().all())


@router.post(
    "",
    response_model=ContactMessageRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit(limit=10, window_seconds=60, scope="contact-message"))],
)
async def create_message(
    payload: ContactMessageCreate,
    db: AsyncSession = Depends(get_db),
) -> ContactMessage:
    message = ContactMessage(**payload.model_dump())
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return message


@router.patch("/{message_id}/status", response_model=ContactMessageRead)
async def update_message_status(
    message_id: int,
    payload: ContactMessageStatusUpdate,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> ContactMessage:
    message = await db.get(ContactMessage, message_id)
    if message is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    message.status = payload.status
    await db.commit()
    await db.refresh(message)
    return message


@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_message(
    message_id: int,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> None:
    message = await db.get(ContactMessage, message_id)
    if message is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    message.status = "archive"
    await db.commit()
