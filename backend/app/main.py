from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.db import check_database, create_database_tables
from app.routes.auth import router as auth_router
from app.routes.clients import router as clients_router
from app.routes.gallery import router as gallery_router
from app.routes.messages import router as messages_router
from app.routes.orders import router as orders_router
from app.routes.products import router as products_router
from app.routes.reservations import router as reservations_router
from app.routes.services import router as services_router
from app.routes.settings import router as settings_router
from app.routes.uploads import ensure_uploads_dir, router as uploads_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    await create_database_tables()
    ensure_uploads_dir()
    yield


app = FastAPI(title="Tableau Tendance API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/db/health")
async def db_health() -> dict[str, object]:
    return await check_database()


@app.get("/api")
async def api_root() -> dict[str, str]:
    return {"message": "Tableau Tendance backend is running"}


app.include_router(reservations_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(clients_router, prefix="/api")
app.include_router(gallery_router, prefix="/api")
app.include_router(messages_router, prefix="/api")
app.include_router(orders_router, prefix="/api")
app.include_router(uploads_router, prefix="/api")
app.include_router(products_router, prefix="/api")
app.include_router(services_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

