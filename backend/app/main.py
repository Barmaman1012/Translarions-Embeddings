from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings

settings = get_settings()

LOCAL_DEV_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://translarions-embeddings-3qpb.vercel.app",
]


def _build_allowed_origins() -> list[str]:
    configured_origins = [
        origin.rstrip("/")
        for origin in settings.allowed_origins
        if isinstance(origin, str) and origin.strip()
    ]
    merged = configured_origins + [
        origin for origin in LOCAL_DEV_ALLOWED_ORIGINS if origin not in configured_origins
    ]
    return merged

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Backend scaffold for translation embedding research workflows.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_build_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/debug/cors", tags=["debug"])
def cors_debug() -> dict[str, list[str]]:
    return {"allowed_origins": _build_allowed_origins()}


app.include_router(api_router, prefix=settings.api_v1_prefix)
