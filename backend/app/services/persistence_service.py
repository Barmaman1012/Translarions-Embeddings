from psycopg import Connection
from typing import Optional

from app.db.connection import get_db_connection
from app.repositories.document_repository import get_document_by_id, insert_document
from app.repositories.segment_repository import insert_segment


def create_document_records(document_payloads: list[dict]) -> list[dict]:
    with get_db_connection() as connection:
        with connection.transaction():
            return [
                insert_document(connection, **document_payload)
                for document_payload in document_payloads
            ]


def get_document_record(document_id: str) -> Optional[dict]:
    with get_db_connection() as connection:
        return get_document_by_id(connection, document_id)


def persist_segments_for_document(
    *, document_id: str, segments: list[dict]
) -> list[dict]:
    with get_db_connection() as connection:
        with connection.transaction():
            _require_document(connection, document_id)
            return [
                insert_segment(
                    connection,
                    document_id=document_id,
                    segment_index=segment["segment_index"],
                    text=segment["text"],
                    normalized_text=segment.get("normalized_text"),
                    metadata=segment.get("metadata"),
                )
                for segment in segments
            ]


def _require_document(connection: Connection, document_id: str) -> None:
    document = get_document_by_id(connection, document_id)
    if document is None:
        raise ValueError(f"Document '{document_id}' does not exist.")
