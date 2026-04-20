import logging

from fastapi import APIRouter, HTTPException, status

from app.db.errors import (
    DatabaseConfigurationError,
    DatabaseConnectionError,
    DatabaseOperationError,
)
from app.schemas.visualization import VisualizationRequest, VisualizationResponse
from app.services.visualization_service import build_embedding_visualization

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/visualization", response_model=VisualizationResponse)
def get_visualization(payload: VisualizationRequest) -> VisualizationResponse:
    try:
        return build_embedding_visualization(payload)
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
        logger.exception("Visualization query failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected visualization failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected visualization failure.",
        ) from exc

