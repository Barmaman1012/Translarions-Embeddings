import logging

from fastapi import APIRouter, HTTPException, status

from app.db.errors import (
    DatabaseConfigurationError,
    DatabaseConnectionError,
    DatabaseOperationError,
)
from app.schemas.similarity import SimilarityRequest, SimilarityResponse
from app.services.similarity_service import compare_segment_similarity

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/similarity", response_model=SimilarityResponse)
def compare_similarity(payload: SimilarityRequest) -> SimilarityResponse:
    try:
        return compare_segment_similarity(payload)
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
        logger.exception("Similarity comparison failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected similarity failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected similarity failure.",
        ) from exc
