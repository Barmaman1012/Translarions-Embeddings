# Translation Embeddins Agent

Infrastructure scaffold for a research platform that compares an original text with one or more translations using multilingual embeddings. The goal is to support ingestion, passage segmentation, embedding generation, storage, and semantic similarity visualization across aligned text segments.

## Project Purpose

This repository is for a full-stack application that helps study how meaning shifts across translations. A user should be able to upload a source text and multiple translated versions, break them into comparable passages, generate multilingual embeddings, persist both text and vectors, and inspect semantic proximity between aligned segments.

The initial focus is local-first development with a clean repository layout and clear separation between frontend, backend, documentation, and data assets.

## V1 Scope

Version 1 is intentionally narrow:

- Upload an original text and one or more translations
- Segment texts into passages
- Store texts, passages, metadata, and embeddings
- Generate multilingual embeddings with `sentence-transformers`
- Persist vectors in Postgres with `pgvector`
- Visualize similarity or distance between aligned passages
- Support local development before deployment work

Out of scope for the first pass:

- Authentication and multi-tenant collaboration
- Automated alignment beyond basic research workflows
- Production deployment pipelines
- Advanced observability, background jobs, or orchestration

## Tech Stack

- Frontend: Next.js, App Router, TypeScript
- Backend: FastAPI, Python
- Database: Supabase Postgres
- Vector storage: `pgvector`
- Embedding generation: `sentence-transformers`
- Local development: Docker Compose placeholders plus native local tooling

## Architecture Overview

The repository is split by responsibility:

- `frontend/`: Next.js application for uploads, browsing texts, and similarity visualizations
- `backend/`: FastAPI service for ingestion, segmentation orchestration, embedding generation, and API endpoints
- `docs/`: project decisions, architecture notes, data model drafts, and roadmap planning
- `data/`: local datasets, imports, and research fixtures that should stay outside application code

Planned runtime flow:

1. The frontend sends text upload and analysis requests to the backend.
2. The backend parses and segments texts into passages.
3. The backend generates multilingual embeddings for passages.
4. Structured text data and metadata are stored in Supabase Postgres.
5. Vector embeddings are stored in Postgres using `pgvector`.
6. The frontend queries comparison data and renders semantic distance views.

## Development Plan

The project should evolve in deliberate stages:

1. Repository and environment scaffolding
2. Backend application skeleton and configuration
3. Frontend application skeleton and API integration points
4. Initial schema design for texts, passages, translations, and embeddings
5. Local ingestion and segmentation workflow
6. Embedding pipeline and vector persistence
7. Research-focused visualization UI
8. Hardening, cleanup, and deployment preparation

## Repository Status

This step only establishes infrastructure scaffolding. No business logic, application code, schema migrations, or containers are implemented yet.
