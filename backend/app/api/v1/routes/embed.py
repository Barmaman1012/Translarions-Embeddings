import logging

from fastapi import APIRouter, HTTPException, status

from app.db.errors import (
    DatabaseConfigurationError,
    DatabaseConnectionError,
    DatabaseOperationError,
)

from app.schemas.embed import EmbedRequest, EmbedResponse
from app.services.embed_service import create_embeddings

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/embed", response_model=EmbedResponse)
def embed_passages(payload: EmbedRequest) -> EmbedResponse:
    try:
        return create_embeddings(payload)
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
        logger.exception("Embedding persistence failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected embedding failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected embedding failure.",
        ) from exc
