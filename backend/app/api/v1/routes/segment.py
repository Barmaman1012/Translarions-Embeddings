from fastapi import APIRouter, HTTPException, status

from app.db.errors import (
    DatabaseConfigurationError,
    DatabaseConnectionError,
    DatabaseOperationError,
)
from app.schemas.segment import SegmentRequest, SegmentResponse
from app.services.segmentation_service import segment_texts

router = APIRouter()


@router.post("/segment", response_model=SegmentResponse)
def segment_content(payload: SegmentRequest) -> SegmentResponse:
    try:
        return segment_texts(payload)
    except ValueError as exc:
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
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
