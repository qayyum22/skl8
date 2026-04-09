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

alter table public.payment_issue_reports enable row level security;

drop policy if exists "customers can manage their own payment issue reports" on public.payment_issue_reports;
create policy "customers can manage their own payment issue reports"
on public.payment_issue_reports
for all
using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

drop policy if exists "agents can read all payment issue reports" on public.payment_issue_reports;
create policy "agents can read all payment issue reports"
on public.payment_issue_reports
for select
using (public.current_app_role() in ('agent', 'admin'));

drop policy if exists "agents can update all payment issue reports" on public.payment_issue_reports;
create policy "agents can update all payment issue reports"
on public.payment_issue_reports
for update
using (public.current_app_role() in ('agent', 'admin'))
with check (public.current_app_role() in ('agent', 'admin'));
