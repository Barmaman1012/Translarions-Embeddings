from fastapi import APIRouter

from app.schemas.upload import UploadRequest, UploadResponse
from app.services.upload_service import create_upload

router = APIRouter()


@router.post("/upload", response_model=UploadResponse)
def upload_texts(payload: UploadRequest) -> UploadResponse:
    return create_upload(payload)
