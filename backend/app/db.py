from collections.abc import AsyncGenerator
import re
import unicodedata

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

settings = get_settings()

engine = create_async_engine(settings.database_url, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


async def check_database() -> dict[str, object]:
    async with engine.connect() as conn:
        result = await conn.execute(text("select 1 as ok"))
        row = result.one()
    return {"ok": row.ok == 1}


async def create_database_tables() -> None:
    import app.entities.admin_user
    import app.entities.client
    import app.entities.gallery
    import app.entities.message
    import app.entities.order
    import app.entities.product
    import app.entities.reservation
    import app.entities.service
    import app.entities.settings

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(
            text(
                "alter table reservations "
                "add column if not exists status varchar(40) not null default 'en_attente'"
            )
        )
        await conn.execute(text("alter table products add column if not exists slug varchar(180)"))

    await seed_admin_user()
    await seed_products()
    await seed_services()
    await seed_gallery_images()


def product_slug(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-")
    slug = slug.removeprefix("tableau-")
    return f"tableau-{slug or 'article'}"


async def unique_product_slug(session: AsyncSession, slug: str, product_id: int | None = None) -> str:
    from app.entities.product import Product

    base_slug = slug
    candidate = base_slug
    suffix = 1
    while True:
        query = select(Product).where(Product.slug == candidate)
        if product_id is not None:
            query = query.where(Product.id != product_id)
        existing = (await session.execute(query)).scalar_one_or_none()
        if existing is None:
            return candidate
        candidate = f"{base_slug}-{suffix}"
        suffix += 1


async def seed_admin_user() -> None:
    from app.auth import hash_password
    from app.entities.admin_user import AdminUser

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(AdminUser).where(AdminUser.email == settings.admin_email))
        admin = result.scalar_one_or_none()
        if admin is None:
            session.add(
                AdminUser(
                    email=settings.admin_email,
                    hashed_password=hash_password(settings.admin_password),
                )
            )
            await session.commit()


async def seed_products() -> None:
    from app.entities.product import Product

    products = [
        {
            "title": "AB01",
            "slug": "tableau-ab01",
            "category": "Tableaux Modernes",
            "price": "32 DT",
            "badge": "Populaire",
            "image": "/uploads/tableau-abstrait.png",
        },
        {
            "title": "AB02",
            "slug": "tableau-ab02",
            "category": "Fleurs & Nature",
            "price": "32 DT",
            "badge": None,
            "image": "/uploads/tableau-fleurs-nature.png",
        },
        {
            "title": "AB03",
            "slug": "tableau-ab03",
            "category": "Calligraphie Arabe",
            "price": "32 DT",
            "badge": "Nouveau",
            "image": "/uploads/tableau-calligraphie.png",
        },
        {
            "title": "AB04",
            "slug": "tableau-ab04",
            "category": "Paysages",
            "price": "32 DT",
            "badge": None,
            "image": "/uploads/tableau-paysage.png",
        },
        {
            "title": "AB05",
            "slug": "tableau-ab05",
            "category": "Design Abstrait",
            "price": "35 DT",
            "badge": None,
            "image": "/uploads/tableau-abstrait.png",
        },
        {
            "title": "AB06",
            "slug": "tableau-ab06",
            "category": "Animaux",
            "price": "34 DT",
            "badge": None,
            "image": "/uploads/tableau-animaux.png",
        },
        {
            "title": "AB07",
            "slug": "tableau-ab07",
            "category": "Cuisines & Divers",
            "price": "32 DT",
            "badge": None,
            "image": "/uploads/tableau-fleurs-nature.png",
        },
        {
            "title": "AB08",
            "slug": "tableau-ab08",
            "category": "Tableaux Modernes",
            "price": "39 DT",
            "badge": None,
            "image": "/uploads/tableau-hero.png",
        },
        {
            "title": "AB09",
            "slug": "tableau-ab09",
            "category": "Fleurs & Nature",
            "price": "32 DT",
            "badge": "Nouveau",
            "image": "/uploads/tableau-fleurs-nature.png",
        },
        {
            "title": "AB10",
            "slug": "tableau-ab10",
            "category": "Design Abstrait",
            "price": "42 DT",
            "badge": None,
            "image": "/uploads/tableau-abstrait.png",
        },
        {
            "title": "AB11",
            "slug": "tableau-ab11",
            "category": "Paysages",
            "price": "35 DT",
            "badge": None,
            "image": "/uploads/tableau-paysage.png",
        },
        {
            "title": "Pack 4 Tableaux tendance",
            "slug": "tableau-pack-4-tableaux-tendance",
            "category": "Offres",
            "price": "99 DT",
            "badge": "Promo",
            "image": "/uploads/tableau-pack-4.png",
        },
    ]

    async with AsyncSessionLocal() as session:
        existing_products = (await session.execute(select(Product))).scalars().all()
        for product in existing_products:
            if not product.slug:
                product.slug = await unique_product_slug(session, product_slug(product.title), product.id)

        if existing_products:
            await session.commit()
            return

        for product_data in products:
            desired_slug = product_slug(product_data["slug"])
            result = await session.execute(
                select(Product).where(Product.title == product_data["title"])
            )
            product = result.scalar_one_or_none()
            product_data["slug"] = await unique_product_slug(
                session,
                desired_slug,
                product.id if product is not None else None,
            )
            if product is None:
                session.add(Product(**product_data))
            else:
                for field, value in product_data.items():
                    setattr(product, field, value)
                product.is_active = True
        await session.commit()


async def seed_services() -> None:
    from app.entities.service import Service

    services = [
        {
            "title": "Tableaux Modernes",
            "description": "Compositions elegantes pour salons contemporains.",
            "duration": "Livraison 24-72h",
            "price": "A partir de 32 DT",
            "category": "Decor mural",
            "image": "/uploads/tableau-abstrait.png",
        },
        {
            "title": "Calligraphie Arabe",
            "description": "Pieces raffinees avec presence artistique et spirituelle.",
            "duration": "Livraison 24-72h",
            "price": "A partir de 32 DT",
            "category": "Calligraphie",
            "image": "/uploads/tableau-calligraphie.png",
        },
        {
            "title": "Fleurs & Nature",
            "description": "Motifs doux et lumineux pour une ambiance apaisee.",
            "duration": "Livraison 24-72h",
            "price": "A partir de 32 DT",
            "category": "Nature",
            "image": "/uploads/tableau-fleurs-nature.png",
        },
        {
            "title": "Design Abstrait",
            "description": "Lignes, textures et dorures pour un interieur premium.",
            "duration": "Livraison 24-72h",
            "price": "A partir de 35 DT",
            "category": "Abstrait",
            "image": "/uploads/tableau-abstrait.png",
        },
        {
            "title": "Animaux",
            "description": "Illustrations expressives pour une decoration de caractere.",
            "duration": "Livraison 24-72h",
            "price": "A partir de 34 DT",
            "category": "Animaux",
            "image": "/uploads/tableau-animaux.png",
        },
        {
            "title": "Paysages",
            "description": "Vues naturelles et horizons chaleureux pour chaque piece.",
            "duration": "Livraison 24-72h",
            "price": "A partir de 32 DT",
            "category": "Paysages",
            "image": "/uploads/tableau-paysage.png",
        },
        {
            "title": "Cuisines & Divers",
            "description": "Tableaux decoratifs adaptes aux cuisines et espaces de vie.",
            "duration": "Livraison 24-72h",
            "price": "A partir de 32 DT",
            "category": "Divers",
            "image": "/uploads/tableau-fleurs-nature.png",
        },
    ]

    async with AsyncSessionLocal() as session:
        existing_services = (await session.execute(select(Service))).scalars().all()
        for service in existing_services:
            service.is_active = False

        for service_data in services:
            result = await session.execute(
                select(Service).where(Service.title == service_data["title"])
            )
            service = result.scalar_one_or_none()
            if service is None:
                session.add(Service(**service_data))
            else:
                for field, value in service_data.items():
                    setattr(service, field, value)
                service.is_active = True
        await session.commit()


async def seed_gallery_images() -> None:
    from app.entities.gallery import GalleryImage

    images = [
        {
            "src": "/uploads/tableau-hero.png",
            "alt": "Tableau decoratif elegant dans une piece moderne",
            "category": "Interieurs",
            "caption": "Ambiance lumineuse et mur soigne",
            "display_order": 1,
        },
        {
            "src": "/uploads/tableau-abstrait.png",
            "alt": "Espace Tableau Tendance lumineux",
            "category": "Interieurs",
            "caption": "Un espace calme mis en valeur par les tableaux",
            "display_order": 2,
        },
        {
            "src": "/uploads/tableau-calligraphie.png",
            "alt": "Detail de tableau moderne",
            "category": "Abstrait",
            "caption": "Texture et couleurs decoratives",
            "display_order": 3,
        },
        {
            "src": "/uploads/tableau-fleurs-nature.png",
            "alt": "Experience salon premium",
            "category": "Interieurs",
            "caption": "Ambiance premium pour interieur chaleureux",
            "display_order": 4,
        },
        {
            "src": "/uploads/tableau-paysage.png",
            "alt": "Selection de tableaux presentes dans un interieur",
            "category": "Collections",
            "caption": "Selection de references pour tous les styles",
            "display_order": 5,
        },
        {
            "src": "/uploads/tableau-animaux.png",
            "alt": "Tableau nature dans une decoration douce",
            "category": "Nature",
            "caption": "Nature et tons doux pour une piece apaisee",
            "display_order": 6,
        },
    ]

    async with AsyncSessionLocal() as session:
        existing_images = (await session.execute(select(GalleryImage))).scalars().all()
        for gallery_image in existing_images:
            gallery_image.is_active = False

        for image_data in images:
            result = await session.execute(
                select(GalleryImage).where(GalleryImage.src == image_data["src"])
            )
            image = result.scalar_one_or_none()
            if image is None:
                session.add(GalleryImage(**image_data))
            else:
                for field, value in image_data.items():
                    setattr(image, field, value)
                image.is_active = True
        await session.commit()

