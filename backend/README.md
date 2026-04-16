# Backend

FastAPI backend scaffold for the translation embedding research project. This service currently exposes a health check and mock API endpoints for projects, uploads, and embedding requests.

## Structure

- `app/main.py`: FastAPI application entrypoint
- `app/api/`: versioned API routers
- `app/core/`: settings and application configuration
- `app/schemas/`: Pydantic request and response models
- `app/services/`: mock service layer used by the API

## Environment

Copy `.env.example` to `.env` before running:

```bash
cp .env.example .env
```

Current environment values are placeholders only. No real database or embedding integration is implemented yet.

## Setup

1. Create and activate a virtual environment
2. Install dependencies:

```bash
pip install -r requirements.txt
```

## Run Locally

Start the development server from the `backend/` directory:

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`.

## Initial Endpoints

- `GET /health`
- `GET /api/v1/projects`
- `POST /api/v1/upload`
- `POST /api/v1/embed`

## Current Scope

This backend is infrastructure scaffolding only. Endpoints return mock responses except for the health check, and there is no live connection to Supabase, Postgres, `pgvector`, or embedding models yet.
