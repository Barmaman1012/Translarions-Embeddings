from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class EmbedRequest(BaseModel):
    model_name: str = Field(..., description="Embedding model to run.")
    document_id: Optional[str] = Field(
        default=None,
        description="If provided, embed only segments for this document.",
    )
    reembed: bool = Field(
        default=False,
        description="If true, overwrite existing embeddings for the same model.",
    )


class EmbedResponse(BaseModel):
    model_name: str
    embedding_dim: int = Field(..., ge=0)
    number_of_segments_embedded: int = Field(..., ge=0)
    affected_document_ids: list[UUID] = Field(default_factory=list)
