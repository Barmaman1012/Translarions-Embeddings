from fastapi import APIRouter

from app.api.v1.routes.embed import router as embed_router
from app.api.v1.routes.ingest_text import router as ingest_text_router
from app.api.v1.routes.projects import router as projects_router
from app.api.v1.routes.segment import router as segment_router
from app.api.v1.routes.similarity import router as similarity_router
from app.api.v1.routes.upload import router as upload_router
from app.api.v1.routes.visualization import router as visualization_router

api_router = APIRouter()
api_router.include_router(projects_router, tags=["projects"])
api_router.include_router(upload_router, tags=["upload"])
api_router.include_router(ingest_text_router, tags=["upload"])
api_router.include_router(segment_router, tags=["segment"])
api_router.include_router(embed_router, tags=["embed"])
api_router.include_router(similarity_router, tags=["similarity"])
api_router.include_router(visualization_router, tags=["visualization"])
