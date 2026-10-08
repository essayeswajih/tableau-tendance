from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import create_access_token, get_current_admin, verify_password
from app.db import get_db
from app.entities.admin_user import AdminUser
from app.models.auth import AdminProfile, LoginRequest, TokenResponse
from app.rate_limit import rate_limit

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/login",
    response_model=TokenResponse,
    dependencies=[Depends(rate_limit(limit=5, window_seconds=60, scope="auth-login"))],
)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    result = await db.execute(select(AdminUser).where(AdminUser.email == payload.email))
    admin = result.scalar_one_or_none()
    if admin is None or not verify_password(payload.password, admin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return TokenResponse(access_token=create_access_token(admin.email))


@router.get("/me", response_model=AdminProfile)
async def me(admin: AdminUser = Depends(get_current_admin)) -> AdminProfile:
    return AdminProfile(id=admin.id, email=admin.email)
