from uuid import UUID
from typing import Optional

from pydantic import BaseModel, Field


class SimilarityRequest(BaseModel):
    model_name: str = Field(..., description="Embedding model used for comparison.")
    source_document_id: str = Field(..., description="Source document identifier.")
    target_document_ids: list[str] = Field(
        default_factory=list,
        description="One or more target document identifiers.",
    )


class SegmentPairSimilarity(BaseModel):
    source_segment_id: UUID
    target_segment_id: UUID
    segment_index: int = Field(..., ge=0)
    source_text: str
    target_text: str
    similarity_score: float


class TargetDocumentSimilarity(BaseModel):
    target_document_id: UUID
    compared_segments_count: int = Field(..., ge=0)
    average_similarity: Optional[float] = None
    segment_pairs: list[SegmentPairSimilarity] = Field(default_factory=list)


class SimilarityResponse(BaseModel):
    model_name: str
    source_document_id: UUID
    targets: list[TargetDocumentSimilarity] = Field(default_factory=list)
