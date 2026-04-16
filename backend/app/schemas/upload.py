from pydantic import BaseModel, Field


class TranslationInput(BaseModel):
    language: str = Field(..., description="Language code or label for the translation.")
    title: str = Field(..., description="Display title for the translation.")
    content: str = Field(..., min_length=1, description="Raw translated text content.")


class UploadRequest(BaseModel):
    project_name: str = Field(..., min_length=1, description="Project name.")
    source_language: str = Field(..., description="Language of the original text.")
    source_text: str = Field(..., min_length=1, description="Raw source text content.")
    translations: list[TranslationInput] = Field(
        default_factory=list,
        description="List of translated texts included in the upload.",
    )


class UploadResponse(BaseModel):
    upload_id: str
    project_name: str
    source_language: str
    translation_count: int = Field(..., ge=0)
    status: str
    message: str
