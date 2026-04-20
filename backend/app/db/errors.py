class DatabaseError(Exception):
    """Base class for persistence-layer errors."""


class DatabaseConfigurationError(DatabaseError):
    """Raised when required database configuration is missing."""


class DatabaseConnectionError(DatabaseError):
    """Raised when a database connection cannot be established."""


class DatabaseOperationError(DatabaseError):
    """Raised when a database query or insert fails."""
