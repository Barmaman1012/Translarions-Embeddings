import logging

from fastapi import APIRouter, HTTPException, status

from app.db.errors import (
    DatabaseConfigurationError,
    DatabaseConnectionError,
    DatabaseOperationError,
)
from app.schemas.upload import RawTextIngestRequest, UploadResponse
from app.services.upload_service import create_text_ingestion

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/ingest-text", response_model=UploadResponse)
def ingest_text(payload: RawTextIngestRequest) -> UploadResponse:
    if not payload.source_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source text must not be empty.",
        )

    if not payload.translations:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one translation text is required.",
        )

    for index, translation in enumerate(payload.translations, start=1):
        if not translation.label.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Each translation must include a non-empty label.",
            )
        if not translation.text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Translation {} text must not be empty.".format(index),
            )

    try:
        return create_text_ingestion(payload)
    except DatabaseConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    except (DatabaseConnectionError, DatabaseOperationError) as exc:
        logger.exception("Raw text ingestion persistence failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected raw text ingestion failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected raw text ingestion failure.",
        ) from exc
