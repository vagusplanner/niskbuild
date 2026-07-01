-- Shift AI — supervised accounts, parental consent, parent contacts
-- Prerequisite: supabase/shift-ai-foundation-migration.sql
-- Run in Supabase SQL Editor. Do not add client RLS policies on consent/token tables.

-- ─── shift_students: account lifecycle columns ───────────────────────────

alter table firstparty.shift_students
  alter column user_id drop not null;

alter table firstparty.shift_students
  add column if not exists parent_email text,
  add column if not exists parent_consent_given boolean not null default false,
  add column if not exists parent_consent_given_at timestamptz,
  add column if not exists account_type text not null default 'self',
  add column if not exists is_active boolean not null default false,
  add column if not exists favourite_subjects text[] not null default '{}',
  add column if not exists login_email text;

alter table firstparty.shift_students
  drop constraint if exists shift_students_account_type_check;

alter table firstparty.shift_students
  add constraint shift_students_account_type_check
  check (account_type in ('self', 'supervised', 'family'));

alter table firstparty.shift_students
  drop constraint if exists shift_students_self_requires_user;

alter table firstparty.shift_students
  add constraint shift_students_self_requires_user
  check (
    account_type <> 'self'
    or user_id is not null
  );

alter table firstparty.shift_students
  drop constraint if exists shift_students_pending_requires_parent_email;

alter table firstparty.shift_students
  add constraint shift_students_pending_requires_parent_email
  check (
    account_type = 'self'
    or parent_email is not null
  );

comment on column firstparty.shift_students.parent_email is
  'Parent contact for supervised/family accounts. Null for 13+ self-registered students.';

comment on column firstparty.shift_students.is_active is
  'False until parent consent for supervised/family; true immediately for self-registered 13+.';

comment on column firstparty.shift_students.login_email is
  'Generated login email for child auth account (supervised/family after consent).';

-- Backfill existing rows (if any) from foundation migration
update firstparty.shift_students
set
  account_type = 'self',
  is_active = true
where user_id is not null;

-- ─── Parental consent requests ───────────────────────────────────────────

create table if not exists firstparty.shift_parent_consent_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references firstparty.shift_students(id) on delete cascade,
  parent_email text not null,
  consent_token text not null unique default gen_random_uuid()::text,
  requested_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '72 hours'),
  responded_at timestamptz,
  status text not null default 'pending',
  constraint shift_parent_consent_parent_email_not_blank
    check (char_length(trim(parent_email)) > 0),
  constraint shift_parent_consent_token_not_blank
    check (char_length(trim(consent_token)) > 0),
  constraint shift_parent_consent_status_check
    check (status in ('pending', 'approved', 'declined'))
);

create index if not exists idx_shift_parent_consent_student
  on firstparty.shift_parent_consent_requests (student_id, requested_at desc);

create index if not exists idx_shift_parent_consent_token
  on firstparty.shift_parent_consent_requests (consent_token);

create index if not exists idx_shift_parent_consent_pending
  on firstparty.shift_parent_consent_requests (status, expires_at)
  where status = 'pending';

comment on table firstparty.shift_parent_consent_requests is
  'Parent consent workflow for under-13 / family accounts. Server-side only — no client RLS policies.';

-- ─── Parent contact registry (not auth.users) ──────────────────────────────

create table if not exists firstparty.shift_parent_accounts (
  id uuid primary key default gen_random_uuid(),
  parent_email text not null,
  verified boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint shift_parent_accounts_email_not_blank
    check (char_length(trim(parent_email)) > 0)
);

create unique index if not exists idx_shift_parent_accounts_email_lower
  on firstparty.shift_parent_accounts (lower(trim(parent_email)));

comment on table firstparty.shift_parent_accounts is
  'Verified parent contacts linked to child accounts via email — not platform auth users.';

-- ─── Row level security ──────────────────────────────────────────────────

alter table firstparty.shift_parent_consent_requests enable row level security;
alter table firstparty.shift_parent_accounts enable row level security;

-- No client-accessible policies — service role / server routes only

-- ─── Grants ──────────────────────────────────────────────────────────────

grant select, insert, update, delete on firstparty.shift_parent_consent_requests to authenticated;
grant select, insert, update, delete on firstparty.shift_parent_accounts to authenticated;

grant all on firstparty.shift_parent_consent_requests to service_role;
grant all on firstparty.shift_parent_accounts to service_role;

grant usage on schema firstparty to authenticated, service_role;
