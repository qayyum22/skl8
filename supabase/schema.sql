-- skl8 support platform schema
-- Run this in the Supabase SQL editor.

create extension if not exists pgcrypto;

create type public.app_role as enum ('customer', 'agent', 'admin');

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

alter table public.profiles enable row level security;
alter table public.support_sessions enable row level security;
alter table public.payment_verification_records enable row level security;
alter table public.payment_issue_reports enable row level security;

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
