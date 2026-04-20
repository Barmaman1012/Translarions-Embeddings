import re
from typing import Optional
import logging

from app.schemas.segment import (
    SegmentDocumentInput,
    SegmentItem,
    SegmentLengthMetadata,
    SegmentedDocument,
    SegmentRequest,
    SegmentResponse,
)
from app.services.persistence_service import get_document_record, persist_segments_for_document

logger = logging.getLogger(__name__)

PARAGRAPH_SPLIT_PATTERN = re.compile(r"\n\s*\n+")
SENTENCE_SPLIT_PATTERN = re.compile(r"(?<=[.!?])\s+")


def segment_texts(payload: SegmentRequest) -> SegmentResponse:
    documents = payload.documents or [
        SegmentDocumentInput(
            label=payload.label or "input_text",
            document_id=payload.document_id,
            language=payload.language,
            text=payload.text or "",
        )
    ]
    logger.info("Segmentation started for %s document(s).", len(documents))

    items = [
        _segment_document(document=document, max_chars_per_segment=payload.max_chars_per_segment)
        for document in documents
    ]
    persisted_segments = sum(
        len([segment for segment in item.segments if segment.persisted]) for item in items
    )

    return SegmentResponse(
        items=items,
        total_documents=len(items),
        total_segments=sum(item.segment_count for item in items),
        persisted_segments=persisted_segments,
        assumptions=[
            "Text is segmented by sentence first using lightweight punctuation heuristics.",
            "Blank lines still preserve paragraph order and act as a clean fallback boundary.",
            "Very long sentence runs are grouped into smaller chunks using the configured threshold.",
            "Normalization is intentionally lightweight so the logic is easy to replace later.",
        ],
    )


def _segment_document(
    *, document: SegmentDocumentInput, max_chars_per_segment: int
) -> SegmentedDocument:
    raw_segments = _segment_text(document.text, max_chars_per_segment)

    segments = [
        SegmentItem(
            segment_index=index,
            text=segment_text,
            normalized_text=_normalize_text(segment_text),
            length=_length_metadata(segment_text),
            metadata=_build_segment_metadata(segment_text),
        )
        for index, segment_text in enumerate(raw_segments)
    ]

    persisted = False
    if document.document_id:
        logger.info("Persisting segments for document_id=%s", document.document_id)
        persisted_document = get_document_record(document.document_id)
        if persisted_document is None:
            raise ValueError(f"Document '{document.document_id}' does not exist.")

        persisted_segments = persist_segments_for_document(
            document_id=document.document_id,
            segments=[
                {
                    "segment_index": segment.segment_index,
                    "text": segment.text,
                    "normalized_text": segment.normalized_text,
                    "metadata": segment.metadata,
                }
                for segment in segments
            ],
        )
        segments = [
            SegmentItem(
                id=persisted_segment["id"],
                document_id=persisted_segment["document_id"],
                segment_index=segment.segment_index,
                text=segment.text,
                normalized_text=segment.normalized_text,
                length=segment.length,
                metadata=persisted_segment.get("metadata"),
                persisted=True,
                created_at=persisted_segment.get("created_at"),
            )
            for segment, persisted_segment in zip(segments, persisted_segments)
        ]
        logger.info(
            "Inserted %s segments for document_id=%s",
            len(persisted_segments),
            document.document_id,
        )
        persisted = True

    return SegmentedDocument(
        label=document.label or "document",
        document_id=document.document_id,
        language=document.language,
        segment_count=len(segments),
        persisted=persisted,
        segments=segments,
    )


def _segment_text(text: str, max_chars_per_segment: int) -> list[str]:
    paragraphs = _split_paragraphs(text)
    raw_segments: list[str] = []

    for paragraph in paragraphs:
        sentence_segments = _split_paragraph_into_sentences(paragraph)
        if not sentence_segments:
            sentence_segments = [paragraph.strip()] if paragraph.strip() else []

        for sentence_segment in sentence_segments:
            if len(sentence_segment) <= max_chars_per_segment:
                raw_segments.append(sentence_segment)
                continue

            raw_segments.extend(_chunk_long_text(sentence_segment, max_chars_per_segment))

    return [segment for segment in raw_segments if segment.strip()]


def _split_paragraphs(text: str) -> list[str]:
    normalized = text.replace("\r\n", "\n").replace("\r", "\n").strip()
    if not normalized:
        return []

    return [paragraph.strip() for paragraph in PARAGRAPH_SPLIT_PATTERN.split(normalized) if paragraph.strip()]


def _split_paragraph_into_sentences(paragraph: str) -> list[str]:
    normalized = re.sub(r"\s*\n\s*", " ", paragraph).strip()
    if not normalized:
        return []

    sentences = [sentence.strip() for sentence in SENTENCE_SPLIT_PATTERN.split(normalized) if sentence.strip()]
    if len(sentences) <= 1:
        return [normalized]

    return sentences


def _chunk_long_text(text: str, max_chars_per_segment: int) -> list[str]:
    sentences = [sentence.strip() for sentence in SENTENCE_SPLIT_PATTERN.split(text) if sentence.strip()]
    if len(sentences) <= 1:
        return _split_on_whitespace(text, max_chars_per_segment)

    chunks: list[str] = []
    current_chunk: list[str] = []
    current_length = 0

    for sentence in sentences:
        sentence_length = len(sentence)
        proposed_length = current_length + sentence_length + (1 if current_chunk else 0)

        if current_chunk and proposed_length > max_chars_per_segment:
            chunks.append(" ".join(current_chunk).strip())
            current_chunk = [sentence]
            current_length = sentence_length
            continue

        current_chunk.append(sentence)
        current_length = proposed_length

    if current_chunk:
        chunks.append(" ".join(current_chunk).strip())

    return chunks or _split_on_whitespace(text, max_chars_per_segment)


def _split_on_whitespace(text: str, max_chars_per_segment: int) -> list[str]:
    words = [word for word in re.split(r"\s+", text.strip()) if word]
    if not words:
        return []

    chunks: list[str] = []
    current_chunk: list[str] = []
    current_length = 0

    for word in words:
        word_length = len(word)
        proposed_length = current_length + word_length + (1 if current_chunk else 0)

        if current_chunk and proposed_length > max_chars_per_segment:
            chunks.append(" ".join(current_chunk).strip())
            current_chunk = [word]
            current_length = word_length
            continue

        current_chunk.append(word)
        current_length = proposed_length

    if current_chunk:
        chunks.append(" ".join(current_chunk).strip())

    return chunks or [text.strip()]


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().lower()


def _length_metadata(text: str) -> SegmentLengthMetadata:
    stripped = text.strip()
    words = [word for word in re.split(r"\s+", stripped) if word]
    return SegmentLengthMetadata(
        char_count=len(stripped),
        word_count=len(words),
    )


def _build_segment_metadata(text: str) -> dict:
    stripped = text.strip()
    return {"char_count": len(stripped), "word_count": len(stripped.split())}
