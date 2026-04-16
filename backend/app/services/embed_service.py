from app.core.config import get_settings
from app.schemas.embed import EmbedRequest, EmbedResponse, EmbedVectorPreview


def create_embeddings(payload: EmbedRequest) -> EmbedResponse:
    settings = get_settings()
    items = [
        EmbedVectorPreview(
            passage_id=passage.id,
            dimensions=384,
            preview=[0.018, -0.104, 0.237],
        )
        for passage in payload.passages
    ]
    return EmbedResponse(
        project_id=payload.project_id,
        model_name=settings.embedding_model_name,
        embedded_count=len(payload.passages),
        status="completed_mock",
        items=items,
    )
