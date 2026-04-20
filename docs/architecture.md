# Architecture

The current architecture is intentionally simple and local-first. The system is split into a Next.js frontend and a FastAPI backend, with Postgres and `pgvector` planned as the persistence layer once the ingestion and analysis flow stabilizes.

## Current Backend Flow

The backend is organized into four main layers:

- `api/`: HTTP routes and request handling
- `schemas/`: Pydantic request and response contracts
- `services/`: replaceable application logic such as upload parsing and segmentation
- `core/`: settings and runtime configuration

Current processing path:

1. Upload text files through `POST /api/v1/upload`
2. Parse supported file types into plain text in memory
3. Segment text into sentence-level units through `POST /api/v1/segment`
4. Persist ordered segments during upload or explicit segmentation when a document id is available
5. Prepare the resulting ordered segments for embedding generation and comparison

## Segmentation Assumptions

The first segmentation implementation is rule-based by design.

- Text is segmented by sentence first for normal prose
- Sentence splitting is heuristic and currently based on punctuation boundaries such as `.`, `!`, and `?`
- Blank lines still preserve paragraph order and act as a clean fallback boundary
- If a sentence run exceeds the configured character threshold, it is grouped into smaller chunks
- `normalized_text` uses lightweight normalization only: whitespace collapse plus lowercase conversion
- Segment metadata currently includes basic length information only

This approach is intentionally readable and easy to replace later with a more research-specific strategy, such as tokenizer-aware segmentation, alignment-aware chunking, or language-specific sentence boundary detection.

## Persistence Boundary

Upload parsing happens in memory, but documents and their generated segments are now persisted before downstream embedding work:

- create `documents` records after successful upload parsing
- create `segments` records after segmentation completes
- create `alignments` later once source-to-translation matching is implemented

## Future Integration

Once persistence is added, the likely flow is:

1. store document metadata and raw content provenance
2. store ordered segments in Postgres
3. generate embeddings for persisted segments
4. query vectors with `pgvector`
5. persist or recompute alignment scores as needed
