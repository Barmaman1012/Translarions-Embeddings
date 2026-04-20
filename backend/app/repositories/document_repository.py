from psycopg import Connection
from typing import Optional

from app.db.errors import DatabaseOperationError


def insert_document(
    connection: Connection,
    *,
    title: str,
    language: Optional[str],
    role: str,
    work_name: str,
    translator_name: Optional[str] = None,
) -> dict:
    query = """
        insert into public.documents (
            title,
            language,
            role,
            work_name,
            translator_name
        )
        values (%s, %s, %s, %s, %s)
        returning
            id,
            title,
            language,
            role,
            work_name,
            translator_name,
            created_at,
            updated_at;
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                query,
                (
                    title,
                    language or "unknown",
                    role,
                    work_name,
                    translator_name,
                ),
            )
            row = cursor.fetchone()
        if row is None:
            raise DatabaseOperationError("Document insert did not return a record.")
        return row
    except DatabaseOperationError:
        raise
    except Exception as exc:
        raise DatabaseOperationError("Failed to insert a document record.") from exc


def get_document_by_id(connection: Connection, document_id: str) -> Optional[dict]:
    query = """
        select
            id,
            title,
            language,
            role,
            work_name,
            translator_name,
            created_at,
            updated_at
        from public.documents
        where id = %s;
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, (document_id,))
            return cursor.fetchone()
    except Exception as exc:
        raise DatabaseOperationError("Failed to load the requested document.") from exc
