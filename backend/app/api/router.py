from fastapi import APIRouter

from app.api.v1.routes.embed import router as embed_router
from app.api.v1.routes.projects import router as projects_router
from app.api.v1.routes.upload import router as upload_router

api_router = APIRouter()
api_router.include_router(projects_router, tags=["projects"])
api_router.include_router(upload_router, tags=["upload"])
api_router.include_router(embed_router, tags=["embed"])
