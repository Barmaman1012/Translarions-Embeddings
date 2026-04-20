import logging
import math
from typing import Optional
from uuid import UUID

from app.db.connection import get_db_connection
from app.repositories.embedding_repository import fetch_segment_embeddings_for_model
from app.schemas.similarity import (
    SegmentPairSimilarity,
    SimilarityRequest,
    SimilarityResponse,
    TargetDocumentSimilarity,
)

logger = logging.getLogger(__name__)


def compare_segment_similarity(payload: SimilarityRequest) -> SimilarityResponse:
    logger.info(
        "Running similarity comparison: model=%s source_document_id=%s target_document_ids=%s",
        payload.model_name,
        payload.source_document_id,
        payload.target_document_ids,
    )

    if not payload.target_document_ids:
        raise ValueError("target_document_ids must contain at least one document id.")

    all_document_ids = [payload.source_document_id, *payload.target_document_ids]
    with get_db_connection() as connection:
        rows = fetch_segment_embeddings_for_model(
            connection,
            model_name=payload.model_name,
            document_ids=all_document_ids,
        )

    grouped = _group_rows_by_document_and_index(rows)
    source_segments = grouped.get(payload.source_document_id, {})

    targets = [
        _build_target_similarity(
            source_segments=source_segments,
            target_document_id=target_document_id,
            target_segments=grouped.get(target_document_id, {}),
        )
        for target_document_id in payload.target_document_ids
    ]

    logger.info(
        "Similarity comparison completed: model=%s total_pairs=%s",
        payload.model_name,
        sum(target.compared_segments_count for target in targets),
    )

    return SimilarityResponse(
        model_name=payload.model_name,
        source_document_id=UUID(payload.source_document_id),
        targets=targets,
    )


def _group_rows_by_document_and_index(rows: list[dict]) -> dict[str, dict[int, dict]]:
    grouped: dict[str, dict[int, dict]] = {}
    for row in rows:
        grouped.setdefault(row["document_id"], {})[row["segment_index"]] = {
            "segment_id": row["segment_id"],
            "segment_index": row["segment_index"],
            "text": row["text"],
            "embedding": _parse_vector_text(row["embedding"]),
        }
    return grouped


def _build_target_similarity(
    *,
    source_segments: dict[int, dict],
    target_document_id: str,
    target_segments: dict[int, dict],
) -> TargetDocumentSimilarity:
    segment_pairs: list[SegmentPairSimilarity] = []

    for segment_index, source_segment in source_segments.items():
        target_segment = target_segments.get(segment_index)
        if target_segment is None:
            continue

        similarity_score = _cosine_similarity(
            source_segment["embedding"], target_segment["embedding"]
        )
        segment_pairs.append(
            SegmentPairSimilarity(
                source_segment_id=UUID(source_segment["segment_id"]),
                target_segment_id=UUID(target_segment["segment_id"]),
                segment_index=segment_index,
                source_text=source_segment["text"],
                target_text=target_segment["text"],
                similarity_score=similarity_score,
            )
        )

    average_similarity: Optional[float] = None
    if segment_pairs:
        average_similarity = sum(
            pair.similarity_score for pair in segment_pairs
        ) / len(segment_pairs)

    return TargetDocumentSimilarity(
        target_document_id=UUID(target_document_id),
        compared_segments_count=len(segment_pairs),
        average_similarity=average_similarity,
        segment_pairs=segment_pairs,
    )


def _parse_vector_text(raw_value: str) -> list[float]:
    stripped = raw_value.strip()[1:-1]
    if not stripped:
        return []
    return [float(value) for value in stripped.split(",")]


def _cosine_similarity(vector_a: list[float], vector_b: list[float]) -> float:
    if not vector_a or not vector_b or len(vector_a) != len(vector_b):
        return 0.0

    dot_product = sum(a * b for a, b in zip(vector_a, vector_b))
    magnitude_a = math.sqrt(sum(value * value for value in vector_a))
    magnitude_b = math.sqrt(sum(value * value for value in vector_b))

    if magnitude_a == 0 or magnitude_b == 0:
        return 0.0

    return dot_product / (magnitude_a * magnitude_b)
