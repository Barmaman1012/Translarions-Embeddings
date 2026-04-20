import logging
from uuid import uuid4
from typing import Optional

from fastapi import UploadFile

from app.schemas.segment import SegmentDocumentInput, SegmentRequest
from app.schemas.upload import (
    DocumentPlaceholder,
    ParsedFileSummary,
    SegmentPreviewItem,
    UploadMetadata,
    UploadResponse,
)
from app.services.persistence_service import create_document_records
from app.services.file_parser_service import build_preview, parse_uploaded_text
from app.services.segmentation_service import segment_texts

logger = logging.getLogger(__name__)


async def create_upload(
    *,
    source_file: UploadFile,
    translation_files: list[UploadFile],
    title: Optional[str],
    work_name: Optional[str],
    source_language: Optional[str],
    translation_language: Optional[str],
) -> UploadResponse:
    parsed_source = await _parse_file(source_file)
    parsed_translations = [await _parse_file(uploaded_file) for uploaded_file in translation_files]

    source_title = title or _filename_stem(source_file.filename)
    source_work_name = work_name or source_title
    translation_base_language = translation_language or "unknown"
    document_payloads = [
        {
            "title": source_title,
            "language": source_language,
            "role": "original",
            "work_name": source_work_name,
            "translator_name": None,
        }
    ]
    document_payloads.extend(
        {
            "title": _filename_stem(parsed_translation["summary"].filename),
            "language": translation_base_language,
            "role": "translation",
            "work_name": source_work_name,
            "translator_name": None,
        }
        for parsed_translation in parsed_translations
    )

    logger.info(
        "Creating document records for upload: source=%s translations=%s work_name=%s",
        parsed_source["summary"].filename,
        len(parsed_translations),
        source_work_name,
    )
    persisted_documents = create_document_records(document_payloads)

    logger.info(
        "Starting automatic segmentation for %s uploaded documents.",
        len(persisted_documents),
    )
    segmentation_result = segment_texts(
        SegmentRequest(
            documents=[
                SegmentDocumentInput(
                    label=source_title,
                    document_id=str(persisted_documents[0]["id"]),
                    language=source_language,
                    text=parsed_source["text"],
                ),
                *[
                    SegmentDocumentInput(
                        label=_filename_stem(parsed_translation["summary"].filename),
                        document_id=str(persisted_documents[index]["id"]),
                        language=translation_base_language,
                        text=parsed_translation["text"],
                    )
                    for index, parsed_translation in enumerate(parsed_translations, start=1)
                ],
            ]
        )
    )
    segmented_documents_by_id = {
        str(item.document_id): item for item in segmentation_result.items if item.document_id is not None
    }

    try:
        documents = [
            DocumentPlaceholder(
                id=persisted_documents[0]["id"],
                role="original",
                title=source_title,
                work_name=source_work_name,
                language=source_language,
                translator_name=None,
                filename=parsed_source["summary"].filename,
                content_length=parsed_source["summary"].content_length,
                segment_count=segmented_documents_by_id[str(persisted_documents[0]["id"])].segment_count,
                segments=_build_segment_previews(
                    segmented_documents_by_id[str(persisted_documents[0]["id"])].segments
                ),
                status="persisted_and_segmented",
                created_at=persisted_documents[0].get("created_at"),
            )
        ]

        for index, parsed_translation in enumerate(parsed_translations, start=1):
            persisted_document = persisted_documents[index]
            documents.append(
                DocumentPlaceholder(
                    id=persisted_document["id"],
                    role="translation",
                    title=_filename_stem(parsed_translation["summary"].filename),
                    work_name=source_work_name,
                    language=translation_base_language,
                    translator_name=None,
                    filename=parsed_translation["summary"].filename,
                    content_length=parsed_translation["summary"].content_length,
                    segment_count=segmented_documents_by_id[str(persisted_document["id"])].segment_count,
                    segments=_build_segment_previews(
                        segmented_documents_by_id[str(persisted_document["id"])].segments
                    ),
                    status="persisted_and_segmented",
                    created_at=persisted_document.get("created_at"),
                )
            )
    except Exception:
        logger.exception("Failed to build upload response with segment previews.")
        raise

    notes = [
        "Document rows were created in Postgres after parsing succeeded.",
        "Each uploaded document was automatically segmented and its segments were inserted into Postgres.",
        "Raw file content is still held in memory only; the current schema stores document metadata and segments, not full source text.",
    ]

    return UploadResponse(
        upload_id=f"upload_{uuid4().hex[:8]}",
        status="parsed_and_segmented",
        metadata=UploadMetadata(
            title=title,
            work_name=work_name,
            source_language=source_language,
            translation_language=translation_language,
        ),
        source_file=parsed_source["summary"],
        translation_files=[parsed_translation["summary"] for parsed_translation in parsed_translations],
        documents=documents,
        notes=notes,
    )


async def _parse_file(uploaded_file: UploadFile) -> dict:
    filename = uploaded_file.filename or "uploaded-file"
    content = await uploaded_file.read()
    extension, parsed_text = parse_uploaded_text(filename, content)
    return {
        "text": parsed_text,
        "summary": ParsedFileSummary(
            filename=filename,
            extension=extension,
            content_length=len(parsed_text),
            preview=build_preview(parsed_text),
        ),
    }


def _filename_stem(filename: Optional[str]) -> str:
    if not filename:
        return "Untitled"
    return filename.rsplit(".", 1)[0] or filename


def _build_segment_previews(segments: list) -> list[SegmentPreviewItem]:
    return [
        SegmentPreviewItem(
            segment_index=segment.segment_index,
            text=segment.text,
            char_count=segment.length.char_count,
        )
        for segment in segments
    ]
