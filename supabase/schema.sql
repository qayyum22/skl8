-- skl8 support platform schema
-- Run this in the Supabase SQL editor.

create extension if not exists pgcrypto;
create extension if not exists vector;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'app_role' and n.nspname = 'public'
  ) then
    create type public.app_role as enum ('customer', 'agent', 'admin');
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'customer'
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'customer'::public.app_role);
$$;

create table if not exists public.support_sessions (
  id text primary key,
  owner_user_id uuid not null references public.profiles (id) on delete cascade,
  owner_role public.app_role not null default 'customer',
  title text not null,
  messages jsonb not null default '[]'::jsonb,
  agent_case jsonb,
  satisfaction numeric(3, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_sessions_owner_user_id_idx on public.support_sessions (owner_user_id);
create index if not exists support_sessions_updated_at_idx on public.support_sessions (updated_at desc);
create index if not exists support_sessions_agent_case_gin_idx on public.support_sessions using gin (agent_case);
create index if not exists support_sessions_messages_gin_idx on public.support_sessions using gin (messages);

create table if not exists public.payment_verification_records (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles (id) on delete cascade,
  learner_id text not null,
  learner_name text not null,
  program_name text not null,
  invoice_id text not null,
  payment_reference text not null,
  amount numeric(10, 2) not null,
  payment_date date not null,
  status text not null,
  next_step text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (learner_id, invoice_id, payment_reference)
);

create index if not exists payment_verification_records_owner_user_id_idx on public.payment_verification_records (owner_user_id);
create index if not exists payment_verification_records_lookup_idx on public.payment_verification_records (learner_id, invoice_id, payment_reference);

create table if not exists public.learner_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles (id) on delete cascade,
  student_id text not null unique,
  email text not null unique,
  learner_name text not null,
  program_name text not null,
  course_name text not null,
  batch_id text not null unique,
  batch_name text not null,
  portal_status text not null,
  current_term text not null,
  mentor_name text not null,
  application_id text not null unique,
  enrollment_status text not null,
  start_date date not null,
  orientation_date date not null,
  course_access_status text not null,
  live_class_link_status text not null,
  next_session text not null,
  timings text not null,
  certificate_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists learner_profiles_owner_user_id_idx on public.learner_profiles (owner_user_id);
create index if not exists learner_profiles_lookup_idx on public.learner_profiles (student_id, email, application_id, batch_id);

create table if not exists public.certificate_request_records (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles (id) on delete cascade,
  student_id text not null,
  learner_name text not null,
  program_name text not null,
  certificate_type text not null check (certificate_type in ('completion', 'bonafide', 'internship', 'grade_report')),
  delivery_method text not null check (delivery_method in ('email', 'portal_download')),
  status text not null default 'requested',
  turnaround_time text not null default '2 business days',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists certificate_request_records_owner_user_id_idx on public.certificate_request_records (owner_user_id);
create index if not exists certificate_request_records_student_id_idx on public.certificate_request_records (student_id, created_at desc);

create table if not exists public.support_escalations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null,
  priority text not null check (priority in ('low', 'medium', 'high', 'urgent')),
  summary text not null,
  assigned_team text not null,
  estimated_wait text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_escalations_owner_user_id_idx on public.support_escalations (owner_user_id);
create index if not exists support_escalations_created_at_idx on public.support_escalations (created_at desc);

create table if not exists public.payment_issue_reports (
  id uuid primary key default gen_random_uuid(),
  session_id text references public.support_sessions (id) on delete set null,
  owner_user_id uuid not null references public.profiles (id) on delete cascade,
  learner_id text,
  issue_type text not null check (issue_type in ('failed_payment', 'duplicate_charge', 'payment_not_reflected', 'receipt_request')),
  issue_label text not null,
  invoice_id text not null,
  payment_reference text not null,
  amount numeric(10, 2),
  payment_date date,
  receipt_email text,
  note text not null,
  status text not null default 'received',
  priority text not null default 'high',
  tracking_code text not null unique,
  response_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_issue_reports_owner_user_id_idx on public.payment_issue_reports (owner_user_id);
create index if not exists payment_issue_reports_session_id_idx on public.payment_issue_reports (session_id);
create index if not exists payment_issue_reports_created_at_idx on public.payment_issue_reports (created_at desc);

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

alter table public.profiles enable row level security;
alter table public.support_sessions enable row level security;
alter table public.payment_verification_records enable row level security;
alter table public.learner_profiles enable row level security;
alter table public.certificate_request_records enable row level security;
alter table public.support_escalations enable row level security;
alter table public.payment_issue_reports enable row level security;
alter table public.knowledge_sources enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.knowledge_sync_runs enable row level security;

drop policy if exists "profiles are readable by their owner" on public.profiles;
drop policy if exists "admins can read all profiles" on public.profiles;
drop policy if exists "admins can update profiles" on public.profiles;
drop policy if exists "customers manage their own sessions" on public.support_sessions;
drop policy if exists "agents can read all sessions" on public.support_sessions;
drop policy if exists "agents can update all sessions" on public.support_sessions;
drop policy if exists "agents can insert sessions" on public.support_sessions;
drop policy if exists "admins can delete sessions" on public.support_sessions;
drop policy if exists "customers can read their own payment verification records" on public.payment_verification_records;
drop policy if exists "agents can read all payment verification records" on public.payment_verification_records;
drop policy if exists "customers can read their own learner profiles" on public.learner_profiles;
drop policy if exists "agents can read all learner profiles" on public.learner_profiles;
drop policy if exists "admins manage learner profiles" on public.learner_profiles;
drop policy if exists "customers can manage their own certificate requests" on public.certificate_request_records;
drop policy if exists "agents can read all certificate requests" on public.certificate_request_records;
drop policy if exists "agents can update all certificate requests" on public.certificate_request_records;
drop policy if exists "customers can manage their own support escalations" on public.support_escalations;
drop policy if exists "agents can read all support escalations" on public.support_escalations;
drop policy if exists "agents can update all support escalations" on public.support_escalations;
drop policy if exists "customers can manage their own payment issue reports" on public.payment_issue_reports;
drop policy if exists "agents can read all payment issue reports" on public.payment_issue_reports;
drop policy if exists "agents can update all payment issue reports" on public.payment_issue_reports;
drop policy if exists "admins manage knowledge sources" on public.knowledge_sources;
drop policy if exists "admins manage knowledge documents" on public.knowledge_documents;
drop policy if exists "admins manage knowledge chunks" on public.knowledge_chunks;
drop policy if exists "admins manage knowledge sync runs" on public.knowledge_sync_runs;

create policy "profiles are readable by their owner"
on public.profiles
for select
using (auth.uid() = id);

create policy "admins can read all profiles"
on public.profiles
for select
using (public.current_app_role() = 'admin');

create policy "admins can update profiles"
on public.profiles
for update
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy "customers manage their own sessions"
on public.support_sessions
for all
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

create policy "agents can read all sessions"
on public.support_sessions
for select
using (public.current_app_role() in ('agent', 'admin'));

create policy "agents can update all sessions"
on public.support_sessions
for update
using (public.current_app_role() in ('agent', 'admin'))
with check (public.current_app_role() in ('agent', 'admin'));

create policy "agents can insert sessions"
on public.support_sessions
for insert
with check (
  auth.uid() = owner_user_id
  or public.current_app_role() in ('agent', 'admin')
);

create policy "admins can delete sessions"
on public.support_sessions
for delete
using (public.current_app_role() = 'admin');

create policy "customers can read their own payment verification records"
on public.payment_verification_records
for select
using (auth.uid() = owner_user_id);

create policy "agents can read all payment verification records"
on public.payment_verification_records
for select
using (public.current_app_role() in ('agent', 'admin'));

create policy "customers can read their own learner profiles"
on public.learner_profiles
for select
using (auth.uid() = owner_user_id);

create policy "agents can read all learner profiles"
on public.learner_profiles
for select
using (public.current_app_role() in ('agent', 'admin'));

create policy "admins manage learner profiles"
on public.learner_profiles
for all
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create policy "customers can manage their own certificate requests"
on public.certificate_request_records
for all
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

create policy "agents can read all certificate requests"
on public.certificate_request_records
for select
using (public.current_app_role() in ('agent', 'admin'));

create policy "agents can update all certificate requests"
on public.certificate_request_records
for update
using (public.current_app_role() in ('agent', 'admin'))
with check (public.current_app_role() in ('agent', 'admin'));

create policy "customers can manage their own support escalations"
on public.support_escalations
for all
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

create policy "agents can read all support escalations"
on public.support_escalations
for select
using (public.current_app_role() in ('agent', 'admin'));

create policy "agents can update all support escalations"
on public.support_escalations
for update
using (public.current_app_role() in ('agent', 'admin'))
with check (public.current_app_role() in ('agent', 'admin'));

create policy "customers can manage their own payment issue reports"
on public.payment_issue_reports
for all
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

create policy "agents can read all payment issue reports"
on public.payment_issue_reports
for select
using (public.current_app_role() in ('agent', 'admin'));

create policy "agents can update all payment issue reports"
on public.payment_issue_reports
for update
using (public.current_app_role() in ('agent', 'admin'))
with check (public.current_app_role() in ('agent', 'admin'));

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

