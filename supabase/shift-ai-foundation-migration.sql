-- Shift AI — foundational tables (firstparty schema)
-- Prerequisite: firstparty schema exposed in Supabase API settings
-- Parent/mentor token RLS policies deferred to a follow-up migration (Postgres function).

create schema if not exists firstparty;

-- ─── Enums ───────────────────────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'firstparty' and t.typname = 'shift_curriculum'
  ) then
    create type firstparty.shift_curriculum as enum ('uk', 'france', 'usa');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'firstparty' and t.typname = 'shift_age_range'
  ) then
    create type firstparty.shift_age_range as enum (
      '7_8',
      '9_10',
      '11_12',
      '13',
      '14_15',
      '16',
      '17'
    );
  end if;
end $$;

comment on type firstparty.shift_age_range is
  'Coarse age band for AI personalisation — not an exact birthdate (ages 7–17).';

-- ─── Schools (minimal reference) ─────────────────────────────────────────

create table if not exists firstparty.shift_schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  constraint shift_schools_name_not_blank check (char_length(trim(name)) > 0)
);

create unique index if not exists idx_shift_schools_name_lower
  on firstparty.shift_schools (lower(trim(name)));

-- ─── Students ────────────────────────────────────────────────────────────

create table if not exists firstparty.shift_students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  curriculum firstparty.shift_curriculum not null default 'uk',
  year_group text not null,
  key_stage text not null,
  age_range firstparty.shift_age_range not null,
  school_id uuid references firstparty.shift_schools(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint shift_students_user_id_unique unique (user_id),
  constraint shift_students_full_name_not_blank check (char_length(trim(full_name)) > 0),
  constraint shift_students_year_group_not_blank check (char_length(trim(year_group)) > 0),
  constraint shift_students_key_stage_not_blank check (char_length(trim(key_stage)) > 0)
);

create index if not exists idx_shift_students_school
  on firstparty.shift_students (school_id)
  where school_id is not null;

comment on table firstparty.shift_students is
  'Shift AI student profile — one row per authenticated student account.';

-- ─── Parent invite tokens ────────────────────────────────────────────────

create table if not exists firstparty.shift_parent_tokens (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references firstparty.shift_students(id) on delete cascade,
  token text not null unique default gen_random_uuid()::text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint shift_parent_tokens_token_not_blank check (char_length(trim(token)) > 0)
);

create index if not exists idx_shift_parent_tokens_student
  on firstparty.shift_parent_tokens (student_id, created_at desc);

create index if not exists idx_shift_parent_tokens_active
  on firstparty.shift_parent_tokens (student_id)
  where revoked_at is null;

comment on table firstparty.shift_parent_tokens is
  'Opaque parent-view tokens for a student. RLS/policies added in a follow-up migration.';

-- ─── Mentor invite tokens ─────────────────────────────────────────────────

create table if not exists firstparty.shift_mentor_tokens (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references firstparty.shift_students(id) on delete cascade,
  token text not null unique default gen_random_uuid()::text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint shift_mentor_tokens_token_not_blank check (char_length(trim(token)) > 0)
);

create index if not exists idx_shift_mentor_tokens_student
  on firstparty.shift_mentor_tokens (student_id, created_at desc);

create index if not exists idx_shift_mentor_tokens_active
  on firstparty.shift_mentor_tokens (student_id)
  where revoked_at is null;

comment on table firstparty.shift_mentor_tokens is
  'Opaque mentor-view tokens for a student. Separate from parent tokens for future permission splits.';

-- ─── Teachers ────────────────────────────────────────────────────────────

create table if not exists firstparty.shift_teachers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  school_id uuid not null references firstparty.shift_schools(id) on delete restrict,
  constraint shift_teachers_user_id_unique unique (user_id)
);

create index if not exists idx_shift_teachers_school
  on firstparty.shift_teachers (school_id);

comment on table firstparty.shift_teachers is
  'Shift AI teacher account linked to a school.';

-- ─── Row level security ───────────────────────────────────────────────────

alter table firstparty.shift_schools enable row level security;
alter table firstparty.shift_students enable row level security;
alter table firstparty.shift_parent_tokens enable row level security;
alter table firstparty.shift_mentor_tokens enable row level security;
alter table firstparty.shift_teachers enable row level security;

-- Students: own row only
drop policy if exists "Students manage own shift_students row" on firstparty.shift_students;
create policy "Students manage own shift_students row"
  on firstparty.shift_students for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Teachers: own row only
drop policy if exists "Teachers manage own shift_teachers row" on firstparty.shift_teachers;
create policy "Teachers manage own shift_teachers row"
  on firstparty.shift_teachers for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- shift_schools, shift_parent_tokens, shift_mentor_tokens: RLS enabled, policies deferred

-- ─── Grants ──────────────────────────────────────────────────────────────

grant select, insert, update, delete on firstparty.shift_schools to authenticated;
grant select, insert, update, delete on firstparty.shift_students to authenticated;
grant select, insert, update, delete on firstparty.shift_parent_tokens to authenticated;
grant select, insert, update, delete on firstparty.shift_mentor_tokens to authenticated;
grant select, insert, update, delete on firstparty.shift_teachers to authenticated;

grant all on firstparty.shift_schools to service_role;
grant all on firstparty.shift_students to service_role;
grant all on firstparty.shift_parent_tokens to service_role;
grant all on firstparty.shift_mentor_tokens to service_role;
grant all on firstparty.shift_teachers to service_role;

grant usage on schema firstparty to authenticated, service_role;
