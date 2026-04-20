from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
import logging
from typing import Optional

from app.db.errors import (
    DatabaseConfigurationError,
    DatabaseConnectionError,
    DatabaseOperationError,
)
from app.schemas.upload import UploadResponse
from app.services.file_parser_service import FileParsingError
from app.services.upload_service import create_upload

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/upload", response_model=UploadResponse)
async def upload_texts(
    source_file: UploadFile = File(..., description="Original source text file."),
    translation_files: list[UploadFile] = File(
        ..., description="One or more translation text files."
    ),
    title: Optional[str] = Form(default=None),
    work_name: Optional[str] = Form(default=None),
    source_language: Optional[str] = Form(default=None),
    translation_language: Optional[str] = Form(default=None),
) -> UploadResponse:
    if not source_file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The source file must include a filename.",
        )

    if not translation_files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one translation file is required.",
        )

    try:
        return await create_upload(
            source_file=source_file,
            translation_files=translation_files,
            title=title,
            work_name=work_name,
            source_language=source_language,
            translation_language=translation_language,
        )
    except FileParsingError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except DatabaseConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    except (DatabaseConnectionError, DatabaseOperationError) as exc:
        logger.exception("Upload persistence failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected upload failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected upload failure.",
        ) from exc
