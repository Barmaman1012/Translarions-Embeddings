import logging
from typing import Optional

from app.db.connection import get_db_connection
from app.repositories.embedding_repository import (
    get_existing_embedding_segment_ids,
    upsert_segment_embedding,
)
from app.repositories.segment_repository import fetch_segments_for_embedding
from app.schemas.embed import EmbedRequest, EmbedResponse
from app.services.embedding_registry import (
    get_embedding_model_definition,
    load_sentence_transformer,
)

logger = logging.getLogger(__name__)


def create_embeddings(payload: EmbedRequest) -> EmbedResponse:
    definition = get_embedding_model_definition(payload.model_name)
    model = load_sentence_transformer(payload.model_name)

    with get_db_connection() as connection:
        try:
            segments = fetch_segments_for_embedding(
                connection, document_id=payload.document_id
            )
        except Exception:
            logger.exception(
                "Failed to fetch segments for embedding: model=%s document_id=%s",
                payload.model_name,
                payload.document_id,
            )
            raise
        logger.info(
            "Embedding model selected: %s; fetched %s segments",
            payload.model_name,
            len(segments),
        )

        segment_ids = [str(segment["id"]) for segment in segments]
        existing_segment_ids = set()
        if not payload.reembed:
            existing_segment_ids = get_existing_embedding_segment_ids(
                connection,
                model_name=payload.model_name,
                segment_ids=segment_ids,
            )

        segments_to_embed = [
            segment
            for segment in segments
            if str(segment["id"]) not in existing_segment_ids
        ]

        if not segments_to_embed:
            embedding_dim = model.get_sentence_embedding_dimension()
            return EmbedResponse(
                model_name=payload.model_name,
                embedding_dim=embedding_dim,
                number_of_segments_embedded=0,
                affected_document_ids=[],
            )

        texts = [
            _prepare_text_for_model(
                segment.get("normalized_text") or segment["text"],
                definition.text_prefix,
            )
            for segment in segments_to_embed
        ]
        vectors = model.encode(
            texts,
            convert_to_numpy=True,
            normalize_embeddings=definition.normalize_embeddings,
            show_progress_bar=False,
        )
        embedding_dim = len(vectors[0]) if len(vectors) > 0 else model.get_sentence_embedding_dimension()

        inserted_or_updated = 0
        affected_document_ids = []
        seen_document_ids = set()
        with connection.transaction():
            for segment, vector in zip(segments_to_embed, vectors):
                upsert_segment_embedding(
                    connection,
                    segment_id=str(segment["id"]),
                    model_name=payload.model_name,
                    embedding=[float(value) for value in vector.tolist()],
                    embedding_dim=embedding_dim,
                )
                inserted_or_updated += 1
                document_id = segment["document_id"]
                document_id_text = str(document_id)
                if document_id_text not in seen_document_ids:
                    seen_document_ids.add(document_id_text)
                    affected_document_ids.append(document_id)

        logger.info(
            "Embedding persistence completed: model=%s fetched=%s persisted=%s",
            payload.model_name,
            len(segments),
            inserted_or_updated,
        )
        return EmbedResponse(
            model_name=payload.model_name,
            embedding_dim=embedding_dim,
            number_of_segments_embedded=inserted_or_updated,
            affected_document_ids=affected_document_ids,
        )


def _prepare_text_for_model(text: str, prefix: str) -> str:
    return f"{prefix}{text}" if prefix else text
