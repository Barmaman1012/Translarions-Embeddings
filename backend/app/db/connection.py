from contextlib import contextmanager
from typing import Iterator

from psycopg import Connection, connect
from psycopg.rows import dict_row

from app.core.config import get_settings
from app.db.errors import (
    DatabaseConfigurationError,
    DatabaseConnectionError,
    DatabaseOperationError,
)


@contextmanager
def get_db_connection() -> Iterator[Connection]:
    settings = get_settings()
    if not settings.database_url:
        raise DatabaseConfigurationError(
            "DATABASE_URL is required for database persistence."
        )

    try:
        connection = connect(settings.database_url, row_factory=dict_row)
    except DatabaseConfigurationError:
        raise
    except Exception as exc:
        raise DatabaseConnectionError(
            "Could not connect to the database using DATABASE_URL."
        ) from exc
    try:
        with connection:
            yield connection
    finally:
        connection.close()


def run_health_query() -> bool:
    try:
        with get_db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute("select 1;")
                row = cursor.fetchone()
        return bool(row)
    except Exception as exc:
        raise DatabaseOperationError("Database health query failed.") from exc
