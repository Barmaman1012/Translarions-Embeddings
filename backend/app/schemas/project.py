from pydantic import BaseModel, Field


class ProjectSummary(BaseModel):
    id: str = Field(..., description="Mock project identifier.")
    name: str = Field(..., description="Research project name.")
    source_language: str = Field(..., description="Primary source language.")
    translation_count: int = Field(..., ge=0, description="Number of translations.")
    status: str = Field(..., description="Current project status.")


class ProjectListResponse(BaseModel):
    items: list[ProjectSummary]
    total: int = Field(..., ge=0)
