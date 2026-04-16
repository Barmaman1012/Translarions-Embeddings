from fastapi import APIRouter

from app.schemas.embed import EmbedRequest, EmbedResponse
from app.services.embed_service import create_embeddings

router = APIRouter()


@router.post("/embed", response_model=EmbedResponse)
def embed_passages(payload: EmbedRequest) -> EmbedResponse:
    return create_embeddings(payload)
