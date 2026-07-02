-- Shift AI Stage 5 — shared curriculum / revision packs
-- Prerequisite: shift-ai-foundation + auth migrations
-- Run in Supabase SQL Editor when ready.

-- ─── Curriculum packs ─────────────────────────────────────────────────────

create table if not exists firstparty.shift_curriculum_packs (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  curriculum text not null,
  year_group text not null,
  title text not null,
  content jsonb not null default '{}'::jsonb,
  source text not null default 'ai'
    check (source in ('admin', 'ai')),
  created_by uuid references auth.users(id) on delete set null,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  constraint shift_curriculum_packs_title_not_blank check (char_length(trim(title)) > 0)
);

create index if not exists idx_shift_curriculum_packs_lookup
  on firstparty.shift_curriculum_packs (curriculum, year_group, subject, is_published);

create index if not exists idx_shift_curriculum_packs_subject_title
  on firstparty.shift_curriculum_packs (subject, lower(title));

comment on table firstparty.shift_curriculum_packs is
  'Shared revision packs — admin-authored or AI-generated, visible by curriculum/year_group.';

-- ─── Row level security ───────────────────────────────────────────────────

alter table firstparty.shift_curriculum_packs enable row level security;

drop policy if exists "Students read published shift_curriculum_packs" on firstparty.shift_curriculum_packs;
create policy "Students read published shift_curriculum_packs"
  on firstparty.shift_curriculum_packs for select
  to authenticated
  using (
    is_published = true
    and exists (
      select 1
      from firstparty.shift_students s
      where s.user_id = auth.uid()
    )
  );

drop policy if exists "Platform owners manage shift_curriculum_packs" on firstparty.shift_curriculum_packs;
create policy "Platform owners manage shift_curriculum_packs"
  on firstparty.shift_curriculum_packs for all
  to authenticated
  using (public.is_platform_owner())
  with check (public.is_platform_owner());

grant select on firstparty.shift_curriculum_packs to authenticated;
grant all on firstparty.shift_curriculum_packs to service_role;

-- ─── Study groups ────────────────────────────────────────────────────────

create table if not exists firstparty.shift_study_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default substr(gen_random_uuid()::text, 1, 8),
  created_by uuid not null references firstparty.shift_students(id) on delete cascade,
  subject text,
  created_at timestamptz not null default now(),
  constraint shift_study_groups_name_not_blank check (char_length(trim(name)) > 0)
);

create index if not exists idx_shift_study_groups_invite_code
  on firstparty.shift_study_groups (invite_code);

create table if not exists firstparty.shift_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references firstparty.shift_study_groups(id) on delete cascade,
  student_id uuid not null references firstparty.shift_students(id) on delete cascade,
  joined_at timestamptz not null default now(),
  constraint shift_group_members_group_student_unique unique (group_id, student_id)
);

create index if not exists idx_shift_group_members_student
  on firstparty.shift_group_members (student_id);

create table if not exists firstparty.shift_group_notes (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references firstparty.shift_study_groups(id) on delete cascade,
  student_id uuid not null references firstparty.shift_students(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  constraint shift_group_notes_content_not_blank check (char_length(trim(content)) > 0)
);

create index if not exists idx_shift_group_notes_group_created
  on firstparty.shift_group_notes (group_id, created_at desc);

create table if not exists firstparty.shift_group_flashcard_sets (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references firstparty.shift_study_groups(id) on delete cascade,
  student_id uuid not null references firstparty.shift_students(id) on delete cascade,
  topic text not null,
  cards jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint shift_group_flashcard_sets_topic_not_blank check (char_length(trim(topic)) > 0)
);

create index if not exists idx_shift_group_flashcard_sets_group
  on firstparty.shift_group_flashcard_sets (group_id, created_at desc);

comment on table firstparty.shift_study_groups is
  'Collaborative study groups — joined via invite code.';
comment on table firstparty.shift_group_members is
  'Membership linking students to study groups.';
comment on table firstparty.shift_group_notes is
  'Shared notes posted by group members.';
comment on table firstparty.shift_group_flashcard_sets is
  'Collaborative flashcard sets shared within a study group.';

-- Membership helper for RLS (tight scope — group data only for members)
create or replace function firstparty.shift_is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = firstparty, public
as $$
  select exists (
    select 1
    from firstparty.shift_group_members gm
    join firstparty.shift_students s on s.id = gm.student_id
    where gm.group_id = p_group_id
      and s.user_id = auth.uid()
  );
$$;

revoke all on function firstparty.shift_is_group_member(uuid) from public;
grant execute on function firstparty.shift_is_group_member(uuid) to authenticated, service_role;

alter table firstparty.shift_study_groups enable row level security;
alter table firstparty.shift_group_members enable row level security;
alter table firstparty.shift_group_notes enable row level security;
alter table firstparty.shift_group_flashcard_sets enable row level security;

drop policy if exists "Members read shift_study_groups" on firstparty.shift_study_groups;
create policy "Members read shift_study_groups"
  on firstparty.shift_study_groups for select
  to authenticated
  using (firstparty.shift_is_group_member(id));

drop policy if exists "Students create shift_study_groups" on firstparty.shift_study_groups;
create policy "Students create shift_study_groups"
  on firstparty.shift_study_groups for insert
  to authenticated
  with check (
    exists (
      select 1
      from firstparty.shift_students s
      where s.id = created_by
        and s.user_id = auth.uid()
    )
  );

drop policy if exists "Members read shift_group_members" on firstparty.shift_group_members;
create policy "Members read shift_group_members"
  on firstparty.shift_group_members for select
  to authenticated
  using (firstparty.shift_is_group_member(group_id));

drop policy if exists "Students join shift_group_members" on firstparty.shift_group_members;
create policy "Students join shift_group_members"
  on firstparty.shift_group_members for insert
  to authenticated
  with check (
    exists (
      select 1
      from firstparty.shift_students s
      where s.id = student_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists "Members read shift_group_notes" on firstparty.shift_group_notes;
create policy "Members read shift_group_notes"
  on firstparty.shift_group_notes for select
  to authenticated
  using (firstparty.shift_is_group_member(group_id));

drop policy if exists "Members post shift_group_notes" on firstparty.shift_group_notes;
create policy "Members post shift_group_notes"
  on firstparty.shift_group_notes for insert
  to authenticated
  with check (
    firstparty.shift_is_group_member(group_id)
    and exists (
      select 1
      from firstparty.shift_students s
      where s.id = student_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists "Members read shift_group_flashcard_sets" on firstparty.shift_group_flashcard_sets;
create policy "Members read shift_group_flashcard_sets"
  on firstparty.shift_group_flashcard_sets for select
  to authenticated
  using (firstparty.shift_is_group_member(group_id));

drop policy if exists "Members create shift_group_flashcard_sets" on firstparty.shift_group_flashcard_sets;
create policy "Members create shift_group_flashcard_sets"
  on firstparty.shift_group_flashcard_sets for insert
  to authenticated
  with check (
    firstparty.shift_is_group_member(group_id)
    and exists (
      select 1
      from firstparty.shift_students s
      where s.id = student_id
        and s.user_id = auth.uid()
    )
  );

grant select, insert on firstparty.shift_study_groups to authenticated;
grant select, insert on firstparty.shift_group_members to authenticated;
grant select, insert on firstparty.shift_group_notes to authenticated;
grant select, insert on firstparty.shift_group_flashcard_sets to authenticated;
grant all on firstparty.shift_study_groups to service_role;
grant all on firstparty.shift_group_members to service_role;
grant all on firstparty.shift_group_notes to service_role;
grant all on firstparty.shift_group_flashcard_sets to service_role;

grant usage on schema firstparty to authenticated, service_role;
