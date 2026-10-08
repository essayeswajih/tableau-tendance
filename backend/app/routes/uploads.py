from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

from app.auth import get_current_admin
from app.entities.admin_user import AdminUser

router = APIRouter(prefix="/uploads", tags=["uploads"])

UPLOADS_DIR = Path("uploads")
ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/webm",
    "application/pdf",
    "application/octet-stream",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


class RenameUploadRequest(BaseModel):
    filename: str = Field(min_length=1, max_length=180)


def ensure_uploads_dir() -> None:
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def media_kind(content_type: str) -> str:
    if content_type.startswith("image/"):
        return "image"
    if content_type.startswith("video/"):
        return "video"
    return "file"


def serialize_file(path: Path) -> dict[str, object]:
    stat = path.stat()
    content_type = "application/octet-stream"
    suffix = path.suffix.lower()
    if suffix in {".jpg", ".jpeg"}:
        content_type = "image/jpeg"
    elif suffix == ".png":
        content_type = "image/png"
    elif suffix == ".webp":
        content_type = "image/webp"
    elif suffix == ".gif":
        content_type = "image/gif"
    elif suffix == ".mp4":
        content_type = "video/mp4"
    elif suffix == ".webm":
        content_type = "video/webm"
    elif suffix == ".pdf":
        content_type = "application/pdf"

    return {
        "filename": path.name,
        "url": f"/uploads/{path.name}",
        "size": stat.st_size,
        "content_type": content_type,
        "kind": media_kind(content_type),
    }


@router.get("")
async def list_uploads(admin: AdminUser = Depends(get_current_admin)) -> list[dict[str, object]]:
    ensure_uploads_dir()
    return [
        serialize_file(path)
        for path in sorted(UPLOADS_DIR.iterdir())
        if path.is_file() and not path.name.startswith(".")
    ]


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_media(
    file: UploadFile = File(...),
    admin: AdminUser = Depends(get_current_admin),
) -> dict[str, object]:
    ensure_uploads_dir()
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File type not allowed")

    original_name = Path(file.filename or "upload").name
    suffix = Path(original_name).suffix
    safe_name = f"{uuid4().hex}{suffix}"
    destination = UPLOADS_DIR / safe_name

    with destination.open("wb") as output:
        while chunk := await file.read(1024 * 1024):
            output.write(chunk)

    return serialize_file(destination)


@router.delete("/{filename}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_upload(
    filename: str,
    admin: AdminUser = Depends(get_current_admin),
) -> None:
    ensure_uploads_dir()
    path = UPLOADS_DIR / Path(filename).name
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    path.unlink()


@router.patch("/{filename}/rename")
async def rename_upload(
    filename: str,
    payload: RenameUploadRequest,
    admin: AdminUser = Depends(get_current_admin),
) -> dict[str, object]:
    ensure_uploads_dir()
    current_path = UPLOADS_DIR / Path(filename).name
    if not current_path.exists() or not current_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    requested_name = Path(payload.filename).name.strip()
    if not requested_name or requested_name.startswith("."):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename")

    new_path = UPLOADS_DIR / requested_name
    if new_path.exists():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Filename already exists")

    current_path.rename(new_path)
    return serialize_file(new_path)
