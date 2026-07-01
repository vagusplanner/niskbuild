-- Shift AI Stage 1 — planner items
-- Prerequisite: shift-ai-foundation-migration.sql + shift-ai-auth-migration.sql
-- Run in Supabase SQL Editor. Do not add client policies on server-only token tables.

-- ─── Planner item type enum ───────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'firstparty' and t.typname = 'shift_planner_item_type'
  ) then
    create type firstparty.shift_planner_item_type as enum (
      'class',
      'homework',
      'test',
      'revision'
    );
  end if;
end $$;

-- ─── Planner items ───────────────────────────────────────────────────────

create table if not exists firstparty.shift_planner_items (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references firstparty.shift_students(id) on delete cascade,
  title text not null,
  description text,
  item_type firstparty.shift_planner_item_type not null default 'homework',
  due_date timestamptz not null,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  constraint shift_planner_items_title_not_blank check (char_length(trim(title)) > 0)
);

create index if not exists idx_shift_planner_items_student_due
  on firstparty.shift_planner_items (student_id, due_date desc);

create index if not exists idx_shift_planner_items_student_open
  on firstparty.shift_planner_items (student_id, completed, due_date)
  where completed = false;

comment on table firstparty.shift_planner_items is
  'Student planner entries — classes, homework, tests, and revision blocks.';

-- ─── Row level security ───────────────────────────────────────────────────

alter table firstparty.shift_planner_items enable row level security;

drop policy if exists "Students manage own shift_planner_items" on firstparty.shift_planner_items;
create policy "Students manage own shift_planner_items"
  on firstparty.shift_planner_items for all
  to authenticated
  using (
    exists (
      select 1
      from firstparty.shift_students s
      where s.id = shift_planner_items.student_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from firstparty.shift_students s
      where s.id = shift_planner_items.student_id
        and s.user_id = auth.uid()
    )
  );

-- ─── Grants ──────────────────────────────────────────────────────────────

grant select, insert, update, delete on firstparty.shift_planner_items to authenticated;
grant all on firstparty.shift_planner_items to service_role;

grant usage on schema firstparty to authenticated, service_role;

-- ─── Chat history role enum ───────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'firstparty' and t.typname = 'shift_chat_role'
  ) then
    create type firstparty.shift_chat_role as enum ('user', 'assistant');
  end if;
end $$;

-- ─── Global AI tutor chat history ────────────────────────────────────────

create table if not exists firstparty.shift_chat_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references firstparty.shift_students(id) on delete cascade,
  subject text,
  role firstparty.shift_chat_role not null,
  content text not null,
  created_at timestamptz not null default now(),
  constraint shift_chat_history_content_not_blank check (char_length(trim(content)) > 0)
);

create index if not exists idx_shift_chat_history_student_created
  on firstparty.shift_chat_history (student_id, created_at desc);

comment on table firstparty.shift_chat_history is
  'Persisted messages for the Shift AI global tutor chat.';

-- ─── Chat history RLS ────────────────────────────────────────────────────

alter table firstparty.shift_chat_history enable row level security;

drop policy if exists "Students manage own shift_chat_history" on firstparty.shift_chat_history;
create policy "Students manage own shift_chat_history"
  on firstparty.shift_chat_history for all
  to authenticated
  using (
    exists (
      select 1
      from firstparty.shift_students s
      where s.id = shift_chat_history.student_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from firstparty.shift_students s
      where s.id = shift_chat_history.student_id
        and s.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on firstparty.shift_chat_history to authenticated;
grant all on firstparty.shift_chat_history to service_role;

-- ─── Subject profiles ────────────────────────────────────────────────────

create table if not exists firstparty.shift_subjects (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references firstparty.shift_students(id) on delete cascade,
  name text not null,
  ai_persona text,
  is_favourite boolean not null default false,
  created_at timestamptz not null default now(),
  constraint shift_subjects_name_not_blank check (char_length(trim(name)) > 0)
);

create unique index if not exists idx_shift_subjects_student_name_lower
  on firstparty.shift_subjects (student_id, lower(trim(name)));

create index if not exists idx_shift_subjects_student
  on firstparty.shift_subjects (student_id, created_at desc);

comment on table firstparty.shift_subjects is
  'Per-student subject profiles with optional AI tutor persona overrides.';

-- ─── Subject notes ─────────────────────────────────────────────────────────

create table if not exists firstparty.shift_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references firstparty.shift_students(id) on delete cascade,
  subject_id uuid not null references firstparty.shift_subjects(id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now(),
  constraint shift_notes_student_subject_unique unique (student_id, subject_id)
);

create index if not exists idx_shift_notes_subject
  on firstparty.shift_notes (subject_id);

comment on table firstparty.shift_notes is
  'Student notes per subject — one row per student/subject pair.';

-- ─── Subjects + notes RLS ────────────────────────────────────────────────

alter table firstparty.shift_subjects enable row level security;
alter table firstparty.shift_notes enable row level security;

drop policy if exists "Students manage own shift_subjects" on firstparty.shift_subjects;
create policy "Students manage own shift_subjects"
  on firstparty.shift_subjects for all
  to authenticated
  using (
    exists (
      select 1
      from firstparty.shift_students s
      where s.id = shift_subjects.student_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from firstparty.shift_students s
      where s.id = shift_subjects.student_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists "Students manage own shift_notes" on firstparty.shift_notes;
create policy "Students manage own shift_notes"
  on firstparty.shift_notes for all
  to authenticated
  using (
    exists (
      select 1
      from firstparty.shift_students s
      where s.id = shift_notes.student_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from firstparty.shift_students s
      where s.id = shift_notes.student_id
        and s.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on firstparty.shift_subjects to authenticated;
grant all on firstparty.shift_subjects to service_role;

grant select, insert, update, delete on firstparty.shift_notes to authenticated;
grant all on firstparty.shift_notes to service_role;
