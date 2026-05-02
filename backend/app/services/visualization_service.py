import logging
import math
from typing import Optional
from uuid import UUID

from app.db.connection import get_db_connection
from app.repositories.embedding_repository import (
    fetch_segment_embeddings_for_visualization,
)
from app.schemas.visualization import (
    VisualizationPoint,
    VisualizationRequest,
    VisualizationResponse,
)
from app.services.embedding_registry import get_embedding_model_definition

logger = logging.getLogger(__name__)


def build_embedding_visualization(
    payload: VisualizationRequest,
) -> VisualizationResponse:
    get_embedding_model_definition(payload.model_name)

    if payload.projection_method.lower() != "pca":
        raise ValueError("Only 'pca' projection is currently supported.")

    if not payload.document_ids:
        raise ValueError("document_ids must contain at least one document id.")

    logger.info(
        "Building visualization projection: model=%s documents=%s method=%s dimensions=%s",
        payload.model_name,
        payload.document_ids,
        payload.projection_method,
        payload.projection_dimensions,
    )

    with get_db_connection() as connection:
        rows = fetch_segment_embeddings_for_visualization(
            connection,
            model_name=payload.model_name,
            document_ids=payload.document_ids,
        )

    if not rows:
        return VisualizationResponse(
            model_name=payload.model_name,
            projection_method="pca",
            projection_dimensions=payload.projection_dimensions,
            point_count=0,
            points=[],
            notes=[
                "No persisted embeddings were found for the selected model and documents.",
                "Run embeddings for the chosen model before opening visualization.",
            ],
        )

    vectors = [_parse_vector_text(row["embedding"]) for row in rows]
    _validate_vectors(vectors)
    distinct_vector_count = len({tuple(vector) for vector in vectors})
    logger.info(
        "Visualization embeddings loaded: points=%s sample_dim=%s distinct_vectors=%s",
        len(vectors),
        len(vectors[0]) if vectors else 0,
        distinct_vector_count,
    )
    coordinates = _project_vectors(vectors, payload.projection_dimensions)
    logger.info(
        "Visualization raw coordinates sample: %s",
        coordinates[: min(5, len(coordinates))],
    )

    points = [
        VisualizationPoint(
            segment_id=UUID(row["segment_id"]),
            document_id=UUID(row["document_id"]),
            document_label=row.get("document_title") or f"Document {index + 1}",
            role=row["document_role"],
            language=row.get("document_language"),
            segment_index=row["segment_index"],
            text=row["text"],
            model_name=row["model_name"],
            embedding_dim=row["embedding_dim"],
            x=coordinate[0],
            y=coordinate[1],
            z=coordinate[2] if len(coordinate) >= 3 else None,
        )
        for index, (row, coordinate) in enumerate(zip(rows, coordinates))
    ]

    logger.info(
        "Visualization projection completed: model=%s points=%s",
        payload.model_name,
        len(points),
    )

    dimensional_note = (
        "PCA is a 3D approximation of the full embedding space."
        if payload.projection_dimensions == 3
        else "PCA is a 2D approximation of the full embedding space."
    )

    return VisualizationResponse(
        model_name=payload.model_name,
        projection_method="pca",
        projection_dimensions=payload.projection_dimensions,
        point_count=len(points),
        points=points,
        notes=[
            dimensional_note,
            "Distances are useful for inspection, but they compress higher-dimensional structure.",
        ],
    )


def _project_vectors(
    vectors: list[list[float]], dimensions: int
) -> list[tuple[float, ...]]:
    if not vectors:
        return []

    if len(vectors) == 1:
        return [tuple(0.0 for _ in range(dimensions))]

    centered = _center_vectors(vectors)
    if not any(any(abs(value) > 1e-12 for value in vector) for vector in centered):
        logger.warning(
            "Visualization projection received zero-variance embeddings after centering."
        )
        return [tuple(0.0 for _ in range(dimensions)) for _ in vectors]

    gram_matrix = _build_gram_matrix(centered)
    components: list[list[float]] = []
    eigenvalues: list[float] = []

    for _ in range(dimensions):
        eigenvector, eigenvalue = _power_iteration(gram_matrix, components)
        if eigenvector is None or eigenvalue <= 1e-12:
            break
        components.append(eigenvector)
        eigenvalues.append(eigenvalue)

    if not components:
        raise ValueError(
            "PCA projection failed to find a usable component from the selected embeddings."
        )

    coordinates: list[tuple[float, ...]] = []
    for row_index in range(len(centered)):
        values = []
        for component_index in range(dimensions):
            values.append(
                components[component_index][row_index] * math.sqrt(eigenvalues[component_index])
                if len(components) > component_index
                else 0.0
            )
        coordinates.append(tuple(values))

    return coordinates


def _center_vectors(vectors: list[list[float]]) -> list[list[float]]:
    dimensions = len(vectors[0]) if vectors else 0
    means = []
    for dimension_index in range(dimensions):
        total = sum(vector[dimension_index] for vector in vectors)
        means.append(total / len(vectors))

    return [
        [value - means[dimension_index] for dimension_index, value in enumerate(vector)]
        for vector in vectors
    ]


def _build_gram_matrix(vectors: list[list[float]]) -> list[list[float]]:
    size = len(vectors)
    matrix = [[0.0 for _ in range(size)] for _ in range(size)]

    for left_index in range(size):
        for right_index in range(left_index, size):
            dot_product = sum(
                left_value * right_value
                for left_value, right_value in zip(
                    vectors[left_index], vectors[right_index]
                )
            )
            matrix[left_index][right_index] = dot_product
            matrix[right_index][left_index] = dot_product

    return matrix


def _power_iteration(
    matrix: list[list[float]],
    previous_components: list[list[float]],
    iterations: int = 100,
) -> tuple[Optional[list[float]], float]:
    size = len(matrix)
    if size == 0:
        return None, 0.0

    vector = _initial_iteration_vector(size, previous_components)

    for _ in range(iterations):
        next_vector = _matrix_vector_product(matrix, vector)
        for component in previous_components:
            projection = _dot_product(next_vector, component)
            next_vector = [
                value - projection * component[index]
                for index, value in enumerate(next_vector)
            ]

        norm = math.sqrt(_dot_product(next_vector, next_vector))
        if norm <= 1e-12:
            return None, 0.0

        vector = [value / norm for value in next_vector]

    matrix_times_vector = _matrix_vector_product(matrix, vector)
    eigenvalue = _dot_product(vector, matrix_times_vector)
    return vector, eigenvalue


def _initial_iteration_vector(
    size: int, previous_components: list[list[float]]
) -> list[float]:
    vector = [float(index + 1) for index in range(size)]

    for component in previous_components:
        projection = _dot_product(vector, component)
        vector = [
            value - projection * component[index]
            for index, value in enumerate(vector)
        ]

    norm = math.sqrt(_dot_product(vector, vector))
    if norm <= 1e-12:
        vector = [1.0 if index % 2 == 0 else -1.0 for index in range(size)]
        norm = math.sqrt(_dot_product(vector, vector))

    return [value / norm for value in vector]


def _matrix_vector_product(matrix: list[list[float]], vector: list[float]) -> list[float]:
    return [
        sum(row[column_index] * vector[column_index] for column_index in range(len(vector)))
        for row in matrix
    ]


def _dot_product(left: list[float], right: list[float]) -> float:
    return sum(left_value * right_value for left_value, right_value in zip(left, right))


def _parse_vector_text(raw_value: str) -> list[float]:
    stripped = raw_value.strip()[1:-1]
    if not stripped:
        return []
    return [float(value) for value in stripped.split(",")]


def _validate_vectors(vectors: list[list[float]]) -> None:
    if not vectors:
        return

    expected_length = len(vectors[0])
    if expected_length == 0:
        raise ValueError("Visualization embeddings are empty.")

    for index, vector in enumerate(vectors):
        if len(vector) != expected_length:
            raise ValueError(
                "Visualization embeddings have inconsistent dimensions."
            )
        if any(math.isnan(value) or math.isinf(value) for value in vector):
            raise ValueError(
                f"Visualization embedding at index {index} contains invalid numeric values."
            )
