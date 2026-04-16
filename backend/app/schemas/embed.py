from pydantic import BaseModel, Field


class PassageInput(BaseModel):
    id: str = Field(..., description="Passage identifier.")
    text: str = Field(..., min_length=1, description="Text to embed.")
    language: str = Field(..., description="Language associated with the passage.")


class EmbedRequest(BaseModel):
    project_id: str = Field(..., description="Project identifier.")
    passages: list[PassageInput] = Field(
        default_factory=list,
        description="Passages that should receive embeddings.",
    )


class EmbedVectorPreview(BaseModel):
    passage_id: str
    dimensions: int = Field(..., ge=0)
    preview: list[float] = Field(
        default_factory=list,
        description="Short mock preview of the resulting vector.",
    )


class EmbedResponse(BaseModel):
    project_id: str
    model_name: str
    embedded_count: int = Field(..., ge=0)
    status: str
    items: list[EmbedVectorPreview]
