# Backend

FastAPI backend scaffold for the translation embedding research project. This service now supports direct Postgres persistence for uploaded document metadata and optionally persisted segments.

## Structure

- `app/main.py`: FastAPI application entrypoint
- `app/api/`: versioned API routers
- `app/core/`: settings and application configuration
- `app/db/`: database connection and persistence errors
- `app/repositories/`: direct Postgres insert and lookup functions
- `app/schemas/`: Pydantic request and response models
- `app/services/`: upload, segmentation, and persistence orchestration

## Environment

Copy `.env.example` to `.env` before running:

```bash
cp .env.example .env
```

Current environment values are placeholders only. No real database or embedding integration is implemented yet.

Required variables:

- `DATABASE_URL`: direct Postgres connection string used by `psycopg`

Optional existing placeholders:

- `EMBEDDING_MODEL_NAME`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Setup

1. Create and activate a virtual environment
2. Install dependencies:

```bash
pip install -r requirements.txt
```

Supported embedding models:

- `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
- `sentence-transformers/LaBSE`
- `intfloat/multilingual-e5-base`

## Run Locally

Start the development server from the `backend/` directory:

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`.

Expected local development URLs:

- frontend: `http://localhost:3000` or `http://127.0.0.1:3000`
- backend: `http://localhost:8000` or `http://127.0.0.1:8000`

The backend CORS configuration explicitly allows the local frontend origins above. After changing CORS settings, restart the FastAPI server.

You can verify the active allowlist with:

```bash
curl http://localhost:8000/debug/cors
```

## Initial Endpoints

- `GET /health`
- `GET /api/v1/projects`
- `POST /api/v1/upload`
- `POST /api/v1/ingest-text`
- `POST /api/v1/segment`
- `POST /api/v1/embed`
- `POST /api/v1/similarity`
- `POST /api/v1/visualization`

## Testing Uploads

The upload endpoint accepts multipart form data with:

- one `source_file`
- one or more `translation_files`
- optional form fields such as `title`, `work_name`, `source_language`, and `translation_language`

Example:

```bash
curl -X POST http://localhost:8000/api/v1/upload \
  -F "source_file=@./samples/source.txt" \
  -F "translation_files=@./samples/translation-es.txt" \
  -F "translation_files=@./samples/translation-fr.md" \
  -F "title=Demo Work" \
  -F "work_name=Demo Work" \
  -F "source_language=en" \
  -F "translation_language=multi"
```

Supported file types:

- `.txt`
- `.md`
- `.json`

Upload flow now:

1. parse files in memory
2. create `documents` rows in Postgres
3. segment each uploaded document automatically using sentence-first rules
4. persist `segments` rows for the source and each translation
5. return parsed previews, created document ids, and segment previews

## Testing Raw Text Ingestion

The raw-text ingestion endpoint accepts JSON and runs the same persistence and
automatic segmentation pipeline as file upload.

Example:

```bash
curl -X POST http://localhost:8000/api/v1/ingest-text \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Demo Work",
    "work_name": "Demo Work",
    "source_language": "he",
    "translation_language": "en",
    "source_text": "האדם נברא כדי לחפש משמעות בעולם.",
    "translations": [
      {
        "label": "English Translation 1",
        "text": "A person is created to seek meaning in the world."
      },
      {
        "label": "English Translation 2",
        "text": "Humans exist in order to discover purpose."
      }
    ]
  }'
```

Raw text ingestion flow:

1. accept source and translation text as JSON
2. create `documents` rows in Postgres
3. segment each document automatically using sentence-first rules
4. persist `segments` rows for the source and each translation
5. return parsed previews, created document ids, and segment previews

## Testing Segmentation

The segmentation endpoint accepts either:

- a single `text` field
- or a `documents` array with one or more text payloads

Example:

```bash
curl -X POST http://localhost:8000/api/v1/segment \
  -H "Content-Type: application/json" \
  -d '{
    "label": "source_text",
    "language": "en",
    "document_id": "replace-with-document-uuid",
    "text": "Paragraph one.\n\nParagraph two is much longer. It has multiple sentences. It can be split further when needed.",
    "max_chars_per_segment": 80
  }'
```

The response returns ordered segments with:

- `segment_index`
- raw `text`
- `normalized_text`
- basic length metadata
- persisted segment ids when `document_id` is provided

Segmentation strategy:

- sentence-first for normal prose using lightweight `.`, `!`, and `?` heuristics
- blank lines still preserve paragraph order and provide a clean fallback boundary
- oversized sentence runs are grouped into smaller chunks using `max_chars_per_segment`
- normalization stays lightweight: whitespace collapse plus lowercase conversion

Segmentation persistence behavior:

- with `document_id`: segments are inserted into `segments`
- without `document_id`: the endpoint stays in preview-only mode

## Example Persistence Flow

1. Upload files and capture returned document ids:

```bash
curl -X POST http://localhost:8000/api/v1/upload \
  -F "source_file=@./samples/source.txt" \
  -F "translation_files=@./samples/translation-es.txt" \
  -F "title=Demo Work" \
  -F "work_name=Demo Work" \
  -F "source_language=en" \
  -F "translation_language=es"
```

2. Persist segments for one returned document:

```bash
curl -X POST http://localhost:8000/api/v1/segment \
  -H "Content-Type: application/json" \
  -d '{
    "label": "source_text",
    "document_id": "replace-with-document-uuid",
    "language": "en",
    "text": "Paragraph one.\n\nParagraph two is much longer. It has multiple sentences. It can be split further when needed.",
    "max_chars_per_segment": 80
  }'
```

## Running Embeddings

Choose a model with `model_name` and optionally scope embedding to one document with `document_id`.

Embed all segments for a model:

```bash
curl -X POST http://localhost:8000/api/v1/embed \
  -H "Content-Type: application/json" \
  -d '{
    "model_name": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
  }'
```

Embed segments for one document only:

```bash
curl -X POST http://localhost:8000/api/v1/embed \
  -H "Content-Type: application/json" \
  -d '{
    "model_name": "sentence-transformers/LaBSE",
    "document_id": "replace-with-document-uuid"
  }'
```

Force re-embedding for the same document/model pair:

```bash
curl -X POST http://localhost:8000/api/v1/embed \
  -H "Content-Type: application/json" \
  -d '{
    "model_name": "intfloat/multilingual-e5-base",
    "document_id": "replace-with-document-uuid",
    "reembed": true
  }'
```

Embedding behavior:

- new embeddings are stored in `segment_embeddings`
- embeddings are unique per `(segment_id, model_name)`
- existing embeddings are skipped unless `reembed=true`

## Running Similarity Comparison

Similarity comparison uses persisted embeddings from `segment_embeddings` and, for V1,
aligns source and target segments by `segment_index`.

Example:

```bash
curl -X POST http://localhost:8000/api/v1/similarity \
  -H "Content-Type: application/json" \
  -d '{
    "model_name": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    "source_document_id": "replace-with-source-document-uuid",
    "target_document_ids": [
      "replace-with-target-document-uuid"
    ]
  }'
```

Similarity response includes, for each target document:

- `target_document_id`
- `compared_segments_count`
- `average_similarity`
- `segment_pairs` with aligned source/target segment ids, texts, and cosine scores

## Running Visualization Projection

Visualization projection uses persisted segment embeddings and currently reduces them
to 2D or 3D with PCA for inspection.

Example:

```bash
curl -X POST http://localhost:8000/api/v1/visualization \
  -H "Content-Type: application/json" \
  -d '{
    "model_name": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    "document_ids": [
      "replace-with-source-document-uuid",
      "replace-with-target-document-uuid"
    ],
    "projection_method": "pca",
    "projection_dimensions": 2
  }'
```

For 3D:

```bash
curl -X POST http://localhost:8000/api/v1/visualization \
  -H "Content-Type: application/json" \
  -d '{
    "model_name": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    "document_ids": [
      "replace-with-source-document-uuid",
      "replace-with-target-document-uuid"
    ],
    "projection_method": "pca",
    "projection_dimensions": 3
  }'
```

Visualization response includes:

- `model_name`
- `projection_method`
- `projection_dimensions`
- `point_count`
- `points` with per-segment metadata and projected coordinates
- notes explaining the projection assumptions

## Current Scope

Current persistence boundary:

- `documents` metadata is persisted during upload
- `segments` can be persisted during segmentation when `document_id` is supplied
- model-specific embeddings can be persisted into `segment_embeddings`
- model-specific segment similarity can be computed from persisted embeddings
- raw uploaded text is not yet stored in the database
- alignments are still not persisted
