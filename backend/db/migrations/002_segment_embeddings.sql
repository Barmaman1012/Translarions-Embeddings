-- Stores model-specific embeddings per segment so multiple embedding models
-- can coexist for the same text without overwriting one another.
create table if not exists public.segment_embeddings (
    id uuid primary key default gen_random_uuid(),
    segment_id uuid not null references public.segments(id) on delete cascade,
    model_name text not null,
    embedding vector not null,
    embedding_dim integer not null,
    created_at timestamptz not null default timezone('utc', now()),
    constraint segment_embeddings_embedding_dim_positive check (embedding_dim > 0),
    constraint segment_embeddings_segment_id_model_name_key unique (segment_id, model_name)
);

comment on table public.segment_embeddings is
    'Stores one embedding vector per segment per model name.';

comment on column public.segment_embeddings.model_name is
    'Fully-qualified embedding model identifier used to generate the vector.';

comment on column public.segment_embeddings.embedding is
    'pgvector embedding for the segment under a specific model.';

create index if not exists idx_segment_embeddings_segment_id
    on public.segment_embeddings (segment_id);

create index if not exists idx_segment_embeddings_model_name
    on public.segment_embeddings (model_name);
