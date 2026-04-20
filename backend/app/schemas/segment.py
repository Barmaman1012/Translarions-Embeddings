from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class SegmentLengthMetadata(BaseModel):
    char_count: int = Field(..., ge=0)
    word_count: int = Field(..., ge=0)


class SegmentItem(BaseModel):
    id: Optional[UUID] = None
    document_id: Optional[UUID] = None
    segment_index: int = Field(..., ge=0)
    text: str
    normalized_text: str
    length: SegmentLengthMetadata
    metadata: Optional[dict] = None
    persisted: bool = False
    created_at: Optional[datetime] = None


class SegmentDocumentInput(BaseModel):
    label: Optional[str] = Field(
        default=None,
        description="Optional label to identify the text source in the response.",
    )
    document_id: Optional[str] = None
    language: Optional[str] = None
    text: str = Field(..., min_length=1)


class SegmentRequest(BaseModel):
    text: Optional[str] = Field(
        default=None,
        description="Raw text for single-document segmentation.",
    )
    label: Optional[str] = Field(
        default=None,
        description="Optional label when segmenting a single text input.",
    )
    document_id: Optional[str] = Field(
        default=None,
        description="Persist segments to this document if provided.",
    )
    language: Optional[str] = None
    documents: list[SegmentDocumentInput] = Field(
        default_factory=list,
        description="Optional multi-document segmentation input.",
    )
    max_chars_per_segment: int = Field(
        default=800,
        ge=100,
        le=5000,
        description="Sentence runs longer than this are grouped into smaller chunks.",
    )

    @model_validator(mode="after")
    def validate_input_shape(self) -> "SegmentRequest":
        has_single_text = bool(self.text and self.text.strip())
        has_documents = bool(self.documents)

        if has_single_text and has_documents:
            raise ValueError("Provide either 'text' or 'documents', not both.")

        if not has_single_text and not has_documents:
            raise ValueError("Provide either a non-empty 'text' field or at least one document.")

        return self


class SegmentedDocument(BaseModel):
    label: str
    document_id: Optional[UUID] = None
    language: Optional[str] = None
    segment_count: int = Field(..., ge=0)
    persisted: bool = False
    segments: list[SegmentItem]


class SegmentResponse(BaseModel):
    items: list[SegmentedDocument]
    total_documents: int = Field(..., ge=0)
    total_segments: int = Field(..., ge=0)
    persisted_segments: int = Field(default=0, ge=0)
    assumptions: list[str] = Field(default_factory=list)
