from psycopg import Connection
from psycopg.types.json import Json
from typing import Optional

from app.db.errors import DatabaseOperationError


def insert_segment(
    connection: Connection,
    *,
    document_id: str,
    segment_index: int,
    text: str,
    normalized_text: Optional[str],
    metadata: Optional[dict],
) -> dict:
    query = """
        insert into public.segments (
            document_id,
            segment_index,
            text,
            normalized_text,
            metadata
        )
        values (%s, %s, %s, %s, %s)
        returning
            id,
            document_id,
            segment_index,
            text,
            normalized_text,
            metadata,
            created_at;
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                query,
                (
                    document_id,
                    segment_index,
                    text,
                    normalized_text,
                    Json(metadata) if metadata is not None else None,
                ),
            )
            row = cursor.fetchone()
        if row is None:
            raise DatabaseOperationError("Segment insert did not return a record.")
        return row
    except DatabaseOperationError:
        raise
    except Exception as exc:
        raise DatabaseOperationError("Failed to insert a segment record.") from exc


def fetch_segments_for_embedding(
    connection: Connection, *, document_id: Optional[str] = None
) -> list[dict]:
    base_query = """
        select
            s.id,
            s.document_id,
            s.segment_index,
            s.text,
            s.normalized_text,
            d.language
        from public.segments s
        join public.documents d on d.id = s.document_id
    """
    try:
        with connection.cursor() as cursor:
            if document_id is not None:
                cursor.execute(
                    base_query
                    + """
                    where s.document_id = %s::uuid
                    order by s.document_id, s.segment_index;
                    """,
                    (document_id,),
                )
            else:
                cursor.execute(
                    base_query
                    + """
                    order by s.document_id, s.segment_index;
                    """
                )
            return cursor.fetchall() or []
    except Exception as exc:
        raise DatabaseOperationError("Failed to fetch segments for embedding.") from exc
