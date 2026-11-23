import uuid
import base64
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.attachment import Attachment

router = APIRouter()

# ── Maximum file size: 15 MB ──────────────────────────────────────────────────
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB

# ── Allowed MIME types ────────────────────────────────────────────────────────
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # docx
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",        # xlsx
    "application/vnd.ms-excel",                                                  # xls
    "application/msword",                                                        # doc
    "text/plain",
    "text/csv",
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "application/json",
}


class AttachmentMeta(BaseModel):
    """Metadata without binary data — for listing."""
    id: str
    entity_type: str
    entity_id: str
    file_name: str
    mime_type: str
    file_size: int
    uploaded_by: Optional[str] = None
    created_at: datetime
    class Config: from_attributes = True


class AttachmentWithData(AttachmentMeta):
    """Metadata + base64-encoded file content — for viewing."""
    data_base64: str


@router.get("", response_model=list[AttachmentMeta])
def list_attachments(
    entity_type: str,
    entity_id: str,
    db: Session = Depends(get_db),
):
    """List attachment metadata for a given entity (no binary data returned)."""
    rows = db.query(Attachment).filter(
        Attachment.entity_type == entity_type,
        Attachment.entity_id == entity_id,
    ).order_by(Attachment.created_at.asc()).all()
    return [AttachmentMeta(
        id=r.id, entity_type=r.entity_type, entity_id=r.entity_id,
        file_name=r.file_name, mime_type=r.mime_type, file_size=r.file_size,
        uploaded_by=r.uploaded_by, created_at=r.created_at,
    ) for r in rows]


@router.post("", response_model=AttachmentMeta, status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    entity_type: str = Form(...),
    entity_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Upload a file and store it as BYTEA in PostgreSQL."""
    # Read file content
    content = await file.read()

    # Validate size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum allowed size is {MAX_FILE_SIZE // (1024*1024)} MB."
        )

    # Detect / validate MIME
    mime = file.content_type or "application/octet-stream"
    if mime not in ALLOWED_MIME_TYPES:
        # Attempt extension-based fallback
        ext = (file.filename or "").rsplit(".", 1)[-1].lower()
        ext_map = {
            "pdf": "application/pdf", "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "xls": "application/vnd.ms-excel", "doc": "application/msword",
            "txt": "text/plain", "csv": "text/csv",
            "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg",
            "gif": "image/gif", "webp": "image/webp", "json": "application/json",
        }
        mime = ext_map.get(ext, mime)
        if mime not in ALLOWED_MIME_TYPES:
            raise HTTPException(status_code=415, detail=f"Unsupported file type: {file.content_type}")

    att = Attachment(
        id=str(uuid.uuid4()),
        entity_type=entity_type,
        entity_id=entity_id,
        file_name=file.filename or "file",
        mime_type=mime,
        file_size=len(content),
        file_data=content,
        uploaded_by=getattr(current_user, "user_full_name", None) or getattr(current_user, "email", None),
    )
    db.add(att); db.commit(); db.refresh(att)

    return AttachmentMeta(
        id=att.id, entity_type=att.entity_type, entity_id=att.entity_id,
        file_name=att.file_name, mime_type=att.mime_type, file_size=att.file_size,
        uploaded_by=att.uploaded_by, created_at=att.created_at,
    )


@router.get("/{attachment_id}/data", response_model=AttachmentWithData)
def get_attachment_data(
    attachment_id: str,
    db: Session = Depends(get_db),
):
    """Return attachment with base64-encoded content for inline viewing."""
    att = db.get(Attachment, attachment_id)
    if not att:
        raise HTTPException(status_code=404, detail="Attachment not found")

    data_b64 = base64.b64encode(att.file_data).decode("utf-8")
    return AttachmentWithData(
        id=att.id, entity_type=att.entity_type, entity_id=att.entity_id,
        file_name=att.file_name, mime_type=att.mime_type, file_size=att.file_size,
        uploaded_by=att.uploaded_by, created_at=att.created_at,
        data_base64=data_b64,
    )


@router.get("/{attachment_id}/raw")
def download_attachment_raw(
    attachment_id: str,
    db: Session = Depends(get_db),
):
    """Return raw binary for direct download (used as fallback for unsupported viewers)."""
    att = db.get(Attachment, attachment_id)
    if not att:
        raise HTTPException(status_code=404, detail="Attachment not found")

    return Response(
        content=att.file_data,
        media_type=att.mime_type,
        headers={"Content-Disposition": f'attachment; filename="{att.file_name}"'},
    )


@router.delete("/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attachment(
    attachment_id: str,
    db: Session = Depends(get_db),
):
    att = db.get(Attachment, attachment_id)
    if not att:
        raise HTTPException(status_code=404, detail="Attachment not found")
    db.delete(att); db.commit()
