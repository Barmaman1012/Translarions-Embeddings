from fastapi import APIRouter

from app.schemas.project import ProjectListResponse
from app.services.project_service import list_projects

router = APIRouter()


@router.get("/projects", response_model=ProjectListResponse)
def get_projects() -> ProjectListResponse:
    return list_projects()
