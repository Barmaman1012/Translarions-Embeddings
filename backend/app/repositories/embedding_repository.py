from typing import Optional

from psycopg import Connection

from app.db.errors import DatabaseOperationError


def get_existing_embedding_segment_ids(
    connection: Connection, *, model_name: str, segment_ids: list[str]
) -> set[str]:
    if not segment_ids:
        return set()

    query = """
        select segment_id::text
        from public.segment_embeddings
        where model_name = %s
          and segment_id = any(%s::uuid[]);
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, (model_name, segment_ids))
            rows = cursor.fetchall() or []
        return {row["segment_id"] for row in rows}
    except Exception as exc:
        raise DatabaseOperationError("Failed to load existing segment embeddings.") from exc


def upsert_segment_embedding(
    connection: Connection,
    *,
    segment_id: str,
    model_name: str,
    embedding: list[float],
    embedding_dim: int,
) -> dict:
    vector_literal = "[" + ",".join(str(value) for value in embedding) + "]"
    query = """
        insert into public.segment_embeddings (
            segment_id,
            model_name,
            embedding,
            embedding_dim
        )
        values (%s, %s, %s::vector, %s)
        on conflict (segment_id, model_name)
        do update set
            embedding = excluded.embedding,
            embedding_dim = excluded.embedding_dim,
            created_at = timezone('utc', now())
        returning
            id,
            segment_id,
            model_name,
            embedding_dim,
            created_at;
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                query,
                (segment_id, model_name, vector_literal, embedding_dim),
            )
            row = cursor.fetchone()
        if row is None:
            raise DatabaseOperationError(
                "Embedding upsert did not return a persisted record."
            )
        return row
    except DatabaseOperationError:
        raise
    except Exception as exc:
        raise DatabaseOperationError("Failed to persist segment embedding.") from exc


def fetch_segment_embeddings_for_model(
    connection: Connection,
    *,
    model_name: str,
    document_ids: list[str],
) -> list[dict]:
    if not document_ids:
        return []

    query = """
        select
            se.segment_id::text as segment_id,
            s.document_id::text as document_id,
            s.segment_index,
            s.text,
            se.model_name,
            se.embedding::text as embedding
        from public.segment_embeddings se
        join public.segments s on s.id = se.segment_id
        where se.model_name = %s
          and s.document_id = any(%s::uuid[])
        order by s.document_id, s.segment_index;
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, (model_name, document_ids))
            return cursor.fetchall() or []
    except Exception as exc:
        raise DatabaseOperationError(
            "Failed to fetch persisted segment embeddings for similarity."
        ) from exc


def fetch_segment_embeddings_for_visualization(
    connection: Connection,
    *,
    model_name: str,
    document_ids: list[str],
) -> list[dict]:
    if not document_ids:
        return []

    query = """
        select
            se.segment_id::text as segment_id,
            s.document_id::text as document_id,
            d.title as document_title,
            d.role as document_role,
            d.language as document_language,
            s.segment_index,
            s.text,
            se.model_name,
            se.embedding_dim,
            se.embedding::text as embedding
        from public.segment_embeddings se
        join public.segments s on s.id = se.segment_id
        join public.documents d on d.id = s.document_id
        where se.model_name = %s
          and s.document_id = any(%s::uuid[])
        order by d.role, s.document_id, s.segment_index;
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, (model_name, document_ids))
            return cursor.fetchall() or []
    except Exception as exc:
        raise DatabaseOperationError(
            "Failed to fetch persisted segment embeddings for visualization."
        ) from exc
