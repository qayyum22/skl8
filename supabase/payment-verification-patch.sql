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

alter table public.payment_verification_records enable row level security;
alter table public.payment_issue_reports add column if not exists learner_id text;

drop policy if exists "customers can read their own payment verification records" on public.payment_verification_records;
create policy "customers can read their own payment verification records"
on public.payment_verification_records
for select
using (auth.uid() = owner_user_id);

drop policy if exists "agents can read all payment verification records" on public.payment_verification_records;
create policy "agents can read all payment verification records"
on public.payment_verification_records
for select
using (public.current_app_role() in ('agent', 'admin'));

insert into public.payment_verification_records (
  owner_user_id,
  learner_id,
  learner_name,
  program_name,
  invoice_id,
  payment_reference,
  amount,
  payment_date,
  status,
  next_step
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'SKL8-1042',
    'Ava Learner',
    'Data Analytics Pro',
    'INV-24018',
    'UPI23947290',
    12500.00,
    date '2026-04-02',
    'Payment received, ledger sync pending',
    'Finance can reconcile this payment to your learner account.'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'SKL8-1042',
    'Ava Learner',
    'Data Analytics Pro',
    'INV-24022',
    'UPI23947771',
    12500.00,
    date '2026-04-07',
    'Payment settled and receipt eligible',
    'Finance can generate and send the receipt after confirmation.'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'SKL8-1042',
    'Ava Learner',
    'Data Analytics Pro',
    'INV-24031',
    'UPI23948901',
    12500.00,
    date '2026-04-08',
    'Two matching transactions found',
    'Finance will compare both transactions before issuing a refund update.'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'SKL8-1042',
    'Ava Learner',
    'Data Analytics Pro',
    'INV-24039',
    'UPI23949055',
    12500.00,
    date '2026-04-09',
    'Gateway hold detected',
    'Finance will confirm whether the hold auto-reverses or needs manual review.'
  )
on conflict (learner_id, invoice_id, payment_reference) do update
set
  learner_name = excluded.learner_name,
  program_name = excluded.program_name,
  amount = excluded.amount,
  payment_date = excluded.payment_date,
  status = excluded.status,
  next_step = excluded.next_step,
  updated_at = now();
