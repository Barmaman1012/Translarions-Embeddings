# Data Model

The initial schema is intentionally compact and centers on three tables:

- `documents`: one row per original text or translation
- `segments`: ordered passage-level chunks derived from a document
- `alignments`: links between source segments and translated target segments

## Entity Overview

### `documents`

Represents a textual artifact within a work. A document can be either:

- an `original`
- a `translation`

Important fields:

- `work_name` groups related originals and translations for the same work
- `translator_name` is nullable because originals do not need it and some translations may lack clean attribution
- `updated_at` is included now even though no update trigger is added yet

### `segments`

Represents a passage extracted from a document. Segments are ordered by `segment_index` and belong to a single document via `document_id`.

Important fields:

- `text` stores the raw segment content
- `normalized_text` is optional for future preprocessing
- `embedding` uses `pgvector` and stays nullable until embeddings are generated
- `metadata` is a flexible `jsonb` field for offsets, token counts, segmentation settings, or experiment annotations

The schema enforces uniqueness on `(document_id, segment_index)` so a document cannot contain duplicate ordered positions.

### `alignments`

Represents a relationship between a source segment and a translated target segment.

Important fields:

- `similarity_score` is optional because some alignments may be manual or heuristic before embedding comparison is run
- `alignment_type` allows early differentiation between manual, rule-based, or embedding-based alignment methods
- `notes` is a lightweight field for research annotations

The schema enforces uniqueness on `(source_segment_id, target_segment_id)` so the same segment pair is not inserted repeatedly.

## Design Notes

- The schema uses UUID primary keys throughout.
- `pgvector` is enabled now so segment embeddings can live directly in Postgres.
- A dedicated vector similarity index is not added yet because the embedding dimension and retrieval metric are still open decisions.
- Standard indexes are included for expected early queries:
  - documents by work, role, and language
  - segments by document and ordered segment position
  - alignments by source or target segment
