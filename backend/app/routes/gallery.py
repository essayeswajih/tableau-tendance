from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_admin
from app.db import get_db
from app.entities.admin_user import AdminUser
from app.entities.gallery import GalleryImage
from app.models.gallery import GalleryImageCreate, GalleryImageRead, GalleryImageUpdate

router = APIRouter(prefix="/gallery", tags=["gallery"])


@router.get("", response_model=list[GalleryImageRead])
async def list_gallery_images(db: AsyncSession = Depends(get_db)) -> list[GalleryImage]:
    result = await db.execute(
        select(GalleryImage)
        .where(GalleryImage.is_active.is_(True))
        .order_by(GalleryImage.display_order, GalleryImage.id)
    )
    return list(result.scalars().all())


@router.get("/admin", response_model=list[GalleryImageRead])
async def list_admin_gallery_images(
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> list[GalleryImage]:
    result = await db.execute(select(GalleryImage).order_by(GalleryImage.display_order, GalleryImage.id))
    return list(result.scalars().all())


@router.post("", response_model=GalleryImageRead, status_code=status.HTTP_201_CREATED)
async def create_gallery_image(
    payload: GalleryImageCreate,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> GalleryImage:
    image = GalleryImage(**payload.model_dump())
    db.add(image)
    await db.commit()
    await db.refresh(image)
    return image


@router.patch("/{image_id}", response_model=GalleryImageRead)
async def update_gallery_image(
    image_id: int,
    payload: GalleryImageUpdate,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> GalleryImage:
    image = await db.get(GalleryImage, image_id)
    if image is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gallery image not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(image, field, value)

    await db.commit()
    await db.refresh(image)
    return image


@router.delete("/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_gallery_image(
    image_id: int,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
) -> None:
    image = await db.get(GalleryImage, image_id)
    if image is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gallery image not found")

    image.is_active = False
    await db.commit()
