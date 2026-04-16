from app.schemas.project import ProjectListResponse, ProjectSummary


def list_projects() -> ProjectListResponse:
    items = [
        ProjectSummary(
            id="proj_001",
            name="Parallel Poetry Set",
            source_language="English",
            translation_count=3,
            status="draft",
        ),
        ProjectSummary(
            id="proj_002",
            name="Modern Essays Corpus",
            source_language="French",
            translation_count=2,
            status="ready",
        ),
    ]
    return ProjectListResponse(items=items, total=len(items))
