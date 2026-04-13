create extension if not exists vector;

create table if not exists public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('url', 'document')),
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'ready', 'syncing', 'error', 'archived')),
  visibility text not null default 'internal' check (visibility in ('public', 'internal')),
  canonical_url text,
  file_name text,
  file_type text,
  document_body text,
  checksum text,
  chunk_count integer not null default 0,
  last_synced_at timestamptz,
  last_error text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists knowledge_sources_canonical_url_idx
on public.knowledge_sources (canonical_url)
where canonical_url is not null;

create index if not exists knowledge_sources_status_idx on public.knowledge_sources (status);
create index if not exists knowledge_sources_visibility_idx on public.knowledge_sources (visibility);

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.knowledge_sources (id) on delete cascade,
  checksum text not null,
  raw_text text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists knowledge_documents_source_id_idx on public.knowledge_documents (source_id, created_at desc);

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.knowledge_sources (id) on delete cascade,
  document_id uuid not null references public.knowledge_documents (id) on delete cascade,
  chunk_index integer not null,
  heading text,
  path text,
  content text not null,
  token_estimate integer not null default 0,
  checksum text not null,
  embedding vector(1536),
  search_tsv tsvector generated always as (
    to_tsvector('english', coalesce(heading, '') || ' ' || coalesce(path, '') || ' ' || coalesce(content, ''))
  ) stored,
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create index if not exists knowledge_chunks_source_id_idx on public.knowledge_chunks (source_id);
create index if not exists knowledge_chunks_document_id_idx on public.knowledge_chunks (document_id);
create index if not exists knowledge_chunks_search_tsv_idx on public.knowledge_chunks using gin (search_tsv);
create index if not exists knowledge_chunks_embedding_idx on public.knowledge_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create table if not exists public.knowledge_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.knowledge_sources (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'running', 'success', 'error')),
  mode text not null default 'single' check (mode in ('single', 'bulk')),
  documents_processed integer not null default 0,
  chunks_created integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists knowledge_sync_runs_source_id_idx on public.knowledge_sync_runs (source_id, started_at desc);

create or replace function public.match_knowledge_chunks(
  query_embedding vector(1536),
  match_count integer default 6
)
returns table (
  chunk_id uuid,
  source_id uuid,
  source_title text,
  source_type text,
  source_url text,
  source_label text,
  heading text,
  content text,
  similarity double precision
)
language sql
stable
as $$
  select
    kc.id as chunk_id,
    ks.id as source_id,
    ks.title as source_title,
    ks.source_type,
    ks.canonical_url as source_url,
    coalesce(ks.file_name, ks.canonical_url, ks.title) as source_label,
    kc.heading,
    kc.content,
    1 - (kc.embedding <=> query_embedding) as similarity
  from public.knowledge_chunks kc
  join public.knowledge_sources ks on ks.id = kc.source_id
  where kc.embedding is not null
    and ks.status = 'ready'
  order by kc.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

create or replace function public.search_knowledge_chunks(
  query_text text,
  match_count integer default 6
)
returns table (
  chunk_id uuid,
  source_id uuid,
  source_title text,
  source_type text,
  source_url text,
  source_label text,
  heading text,
  content text,
  rank double precision
)
language sql
stable
as $$
  select
    kc.id as chunk_id,
    ks.id as source_id,
    ks.title as source_title,
    ks.source_type,
    ks.canonical_url as source_url,
    coalesce(ks.file_name, ks.canonical_url, ks.title) as source_label,
    kc.heading,
    kc.content,
    ts_rank_cd(kc.search_tsv, websearch_to_tsquery('english', query_text)) as rank
  from public.knowledge_chunks kc
  join public.knowledge_sources ks on ks.id = kc.source_id
  where ks.status = 'ready'
    and kc.search_tsv @@ websearch_to_tsquery('english', query_text)
  order by rank desc, kc.created_at desc
  limit greatest(match_count, 1);
$$;

alter table public.knowledge_sources enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.knowledge_sync_runs enable row level security;

create policy "admins manage knowledge sources"
on public.knowledge_sources
for all
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy "admins manage knowledge documents"
on public.knowledge_documents
for all
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy "admins manage knowledge chunks"
on public.knowledge_chunks
for all
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy "admins manage knowledge sync runs"
on public.knowledge_sync_runs
for all
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');
