-- Initial schema for the translation embedding research project.
-- This migration stays intentionally narrow: documents, segments, and alignments.
-- It is designed for Supabase/Postgres with pgvector available for later similarity search.

-- UUID generation is convenient for application-side and SQL-side inserts.
create extension if not exists pgcrypto;

-- pgvector stores multilingual embeddings directly in Postgres.
create extension if not exists vector;

-- documents represents a single textual artifact:
-- either the original work or a specific translation of that work.
create table if not exists public.documents (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    language text not null,
    role text not null check (role in ('original', 'translation')),
    work_name text not null,
    translator_name text null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.documents is
    'Stores original texts and translated documents for a shared work.';

comment on column public.documents.role is
    'Distinguishes source documents from translated variants.';

comment on column public.documents.work_name is
    'Logical grouping key for the same work across original and translation documents.';

-- segments stores passage-level chunks derived from a document.
-- embedding uses pgvector and is nullable because segmentation may happen before embedding.
-- The vector dimension is intentionally left unconstrained until the embedding model is finalized.
create table if not exists public.segments (
    id uuid primary key default gen_random_uuid(),
    document_id uuid not null references public.documents(id) on delete cascade,
    segment_index integer not null,
    text text not null,
    normalized_text text null,
    embedding vector null,
    metadata jsonb null,
    created_at timestamptz not null default timezone('utc', now()),
    constraint segments_segment_index_nonnegative check (segment_index >= 0),
    constraint segments_document_id_segment_index_key unique (document_id, segment_index)
);

comment on table public.segments is
    'Stores ordered text segments for each document, plus optional embeddings and segment metadata.';

comment on column public.segments.segment_index is
    'Zero-based or one-based ordering can be used by the application, but must be consistent per document.';

comment on column public.segments.embedding is
    'Multilingual embedding stored with pgvector; nullable until embeddings are generated.';

comment on column public.segments.metadata is
    'Flexible JSONB field for segmentation strategy, token counts, offsets, or experiment annotations.';

-- alignments links a source segment to a translated target segment.
-- This model allows multiple alignment strategies later by keeping alignment_type and notes flexible.
create table if not exists public.alignments (
    id uuid primary key default gen_random_uuid(),
    source_segment_id uuid not null references public.segments(id) on delete cascade,
    target_segment_id uuid not null references public.segments(id) on delete cascade,
    similarity_score double precision null,
    alignment_type text null,
    notes text null,
    created_at timestamptz not null default timezone('utc', now()),
    constraint alignments_distinct_segment_pair check (source_segment_id <> target_segment_id),
    constraint alignments_source_target_unique unique (source_segment_id, target_segment_id)
);

comment on table public.alignments is
    'Stores passage-level links between source segments and translated segments.';

comment on column public.alignments.similarity_score is
    'Optional numeric score from alignment or embedding-comparison workflows.';

comment on column public.alignments.alignment_type is
    'Optional label such as manual, heuristic, or embedding-based.';

-- Common access patterns:
-- 1. List documents by work and role
-- 2. Fetch segments for a document in order
-- 3. Resolve alignments from source or target side
create index if not exists idx_documents_work_name
    on public.documents (work_name);

create index if not exists idx_documents_role
    on public.documents (role);

create index if not exists idx_documents_language
    on public.documents (language);

create index if not exists idx_segments_document_id
    on public.segments (document_id);

create index if not exists idx_segments_document_id_segment_index
    on public.segments (document_id, segment_index);

create index if not exists idx_segments_metadata_gin
    on public.segments using gin (metadata);

create index if not exists idx_alignments_source_segment_id
    on public.alignments (source_segment_id);

create index if not exists idx_alignments_target_segment_id
    on public.alignments (target_segment_id);

create index if not exists idx_alignments_similarity_score
    on public.alignments (similarity_score);

-- Vector similarity indexes are intentionally deferred for now.
-- Once the embedding dimension and distance metric are finalized, add an HNSW or IVFFlat index
-- on segments.embedding using the operator class that matches the retrieval strategy.
