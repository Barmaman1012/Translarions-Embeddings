from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class VisualizationRequest(BaseModel):
    model_name: str = Field(..., description="Embedding model used for projection.")
    document_ids: list[str] = Field(
        default_factory=list,
        description="Document identifiers to include in the visualization.",
    )
    projection_method: str = Field(
        default="pca",
        description="Projection method. PCA is currently supported.",
    )


class VisualizationPoint(BaseModel):
    segment_id: UUID
    document_id: UUID
    document_label: str
    role: str
    language: Optional[str] = None
    segment_index: int = Field(..., ge=0)
    text: str
    model_name: str
    embedding_dim: int = Field(..., ge=0)
    x: float
    y: float


class VisualizationResponse(BaseModel):
    model_name: str
    projection_method: str
    point_count: int = Field(..., ge=0)
    points: list[VisualizationPoint] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)

