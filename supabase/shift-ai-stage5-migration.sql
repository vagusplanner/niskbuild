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

grant usage on schema firstparty to authenticated, service_role;
