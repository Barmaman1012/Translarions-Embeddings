import logging
from uuid import uuid4
from typing import Optional

from fastapi import UploadFile

from app.schemas.segment import SegmentDocumentInput, SegmentRequest
from app.schemas.upload import (
    DocumentPlaceholder,
    ParsedFileSummary,
    RawTextIngestRequest,
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

    return _create_persisted_upload_response(
        source_text=parsed_source["text"],
        source_summary=parsed_source["summary"],
        translation_inputs=[
            {
                "text": parsed_translation["text"],
                "summary": parsed_translation["summary"],
                "title": _filename_stem(parsed_translation["summary"].filename),
            }
            for parsed_translation in parsed_translations
        ],
        title=title,
        work_name=work_name,
        source_language=source_language,
        translation_language=translation_language,
        notes=[
            "Document rows were created in Postgres after parsing succeeded.",
            "Each uploaded document was automatically segmented and its segments were inserted into Postgres.",
            "Raw file content is still held in memory only; the current schema stores document metadata and segments, not full source text.",
        ],
    )


def create_text_ingestion(payload: RawTextIngestRequest) -> UploadResponse:
    source_title = payload.title or "Pasted source text"
    source_summary = ParsedFileSummary(
        filename="pasted-source.txt",
        extension=".txt",
        content_length=len(payload.source_text.strip()),
        preview=build_preview(payload.source_text),
    )
    translation_inputs = [
        {
            "text": translation.text,
            "summary": ParsedFileSummary(
                filename=_label_to_filename(translation.label, index),
                extension=".txt",
                content_length=len(translation.text.strip()),
                preview=build_preview(translation.text),
            ),
            "title": translation.label.strip() or f"Translation {index + 1}",
        }
        for index, translation in enumerate(payload.translations)
    ]

    return _create_persisted_upload_response(
        source_text=payload.source_text,
        source_summary=source_summary,
        translation_inputs=translation_inputs,
        title=source_title,
        work_name=payload.work_name,
        source_language=payload.source_language,
        translation_language=payload.translation_language,
        notes=[
            "Raw pasted text was ingested directly through the backend.",
            "Document rows were created in Postgres and segmented immediately after ingestion.",
            "Manual paste mode now follows the same persisted review pipeline as file uploads.",
        ],
    )


def _create_persisted_upload_response(
    *,
    source_text: str,
    source_summary: ParsedFileSummary,
    translation_inputs: list[dict],
    title: Optional[str],
    work_name: Optional[str],
    source_language: Optional[str],
    translation_language: Optional[str],
    notes: list[str],
) -> UploadResponse:
    source_title = title or _filename_stem(source_summary.filename)
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
            "title": translation_input["title"],
            "language": translation_base_language,
            "role": "translation",
            "work_name": source_work_name,
            "translator_name": None,
        }
        for translation_input in translation_inputs
    )

    logger.info(
        "Creating document records for upload: source=%s translations=%s work_name=%s",
        source_summary.filename,
        len(translation_inputs),
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
                    text=source_text,
                ),
                *[
                    SegmentDocumentInput(
                        label=translation_input["title"],
                        document_id=str(persisted_documents[index]["id"]),
                        language=translation_base_language,
                        text=translation_input["text"],
                    )
                    for index, translation_input in enumerate(translation_inputs, start=1)
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
                filename=source_summary.filename,
                content_length=source_summary.content_length,
                segment_count=segmented_documents_by_id[str(persisted_documents[0]["id"])].segment_count,
                segments=_build_segment_previews(
                    segmented_documents_by_id[str(persisted_documents[0]["id"])].segments
                ),
                status="persisted_and_segmented",
                created_at=persisted_documents[0].get("created_at"),
            )
        ]

        for index, translation_input in enumerate(translation_inputs, start=1):
            persisted_document = persisted_documents[index]
            documents.append(
                DocumentPlaceholder(
                    id=persisted_document["id"],
                    role="translation",
                    title=translation_input["title"],
                    work_name=source_work_name,
                    language=translation_base_language,
                    translator_name=None,
                    filename=translation_input["summary"].filename,
                    content_length=translation_input["summary"].content_length,
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

    return UploadResponse(
        upload_id=f"upload_{uuid4().hex[:8]}",
        status="parsed_and_segmented",
        metadata=UploadMetadata(
            title=title,
            work_name=work_name,
            source_language=source_language,
            translation_language=translation_language,
        ),
        source_file=source_summary,
        translation_files=[translation_input["summary"] for translation_input in translation_inputs],
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


def _label_to_filename(label: str, index: int) -> str:
    stripped = label.strip()
    if stripped:
        normalized = "".join(
            character.lower() if character.isalnum() else "-"
            for character in stripped
        )
        normalized = "-".join(part for part in normalized.split("-") if part)
        if normalized:
            return "{}.txt".format(normalized)

    return "translation-{}.txt".format(index + 1)


def _build_segment_previews(segments: list) -> list[SegmentPreviewItem]:
    return [
        SegmentPreviewItem(
            segment_index=segment.segment_index,
            text=segment.text,
            char_count=segment.length.char_count,
        )
        for segment in segments
    ]
