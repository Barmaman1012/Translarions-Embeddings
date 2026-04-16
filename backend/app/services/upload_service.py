from uuid import uuid4

from app.schemas.upload import UploadRequest, UploadResponse


def create_upload(payload: UploadRequest) -> UploadResponse:
    return UploadResponse(
        upload_id=f"upload_{uuid4().hex[:8]}",
        project_name=payload.project_name,
        source_language=payload.source_language,
        translation_count=len(payload.translations),
        status="queued",
        message="Mock upload accepted. Persistence and processing are not implemented yet.",
    )
