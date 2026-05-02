from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ParsedFileSummary(BaseModel):
    filename: str
    extension: str
    content_length: int = Field(..., ge=0)
    preview: str


class SegmentPreviewItem(BaseModel):
    segment_index: int = Field(..., ge=0)
    text: str
    char_count: int = Field(..., ge=0)


class DocumentPlaceholder(BaseModel):
    id: UUID
    role: str
    title: str
    work_name: Optional[str] = None
    language: Optional[str] = None
    translator_name: Optional[str] = None
    filename: str
    content_length: int = Field(..., ge=0)
    segment_count: int = Field(default=0, ge=0)
    segments: list[SegmentPreviewItem] = Field(default_factory=list)
    status: str
    created_at: Optional[datetime] = None


class UploadMetadata(BaseModel):
    title: Optional[str] = None
    work_name: Optional[str] = None
    source_language: Optional[str] = None
    translation_language: Optional[str] = None


class RawTextTranslationInput(BaseModel):
    label: str = Field(..., min_length=1)
    text: str = Field(..., min_length=1)


class RawTextIngestRequest(BaseModel):
    title: Optional[str] = None
    work_name: Optional[str] = None
    source_language: Optional[str] = None
    translation_language: Optional[str] = None
    source_text: str = Field(..., min_length=1)
    translations: list[RawTextTranslationInput] = Field(..., min_length=1)


class UploadResponse(BaseModel):
    upload_id: str
    status: str
    metadata: UploadMetadata
    source_file: ParsedFileSummary
    translation_files: list[ParsedFileSummary]
    documents: list[DocumentPlaceholder]
    notes: list[str] = Field(default_factory=list)
