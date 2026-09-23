-- Persistent builder conversation turns (v1)
-- One row per generation/edit attempt, including failures and interruptions.

create table if not exists public.builder_turns (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  prompt text not null default '',
  outcome text not null
    check (outcome in ('built', 'edited', 'interrupted', 'failed')),
  outcome_detail text not null default '',
  model_id text not null default '',
  model_label text not null default '',
  credits_used numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_builder_turns_project_created
  on public.builder_turns (project_id, created_at asc);

alter table public.builder_turns enable row level security;

drop policy if exists "Users read own project builder turns" on public.builder_turns;
create policy "Users read own project builder turns"
  on public.builder_turns for select
  using (
    exists (
      select 1 from public.projects
      where projects.id = builder_turns.project_id
        and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users insert own project builder turns" on public.builder_turns;
create policy "Users insert own project builder turns"
  on public.builder_turns for insert
  with check (
    exists (
      select 1 from public.projects
      where projects.id = builder_turns.project_id
        and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users delete own project builder turns" on public.builder_turns;
create policy "Users delete own project builder turns"
  on public.builder_turns for delete
  using (
    exists (
      select 1 from public.projects
      where projects.id = builder_turns.project_id
        and projects.user_id = auth.uid()
    )
  );

-- One-time backfill from project_versions for projects with no turns yet.
insert into public.builder_turns (
  project_id,
  prompt,
  outcome,
  outcome_detail,
  model_id,
  model_label,
  credits_used,
  created_at
)
select
  pv.project_id,
  coalesce(nullif(trim(pv.prompt_used), ''), 'Earlier generation'),
  'built',
  'Backfilled from version history',
  '',
  '',
  coalesce(pv.credits_used, 0),
  pv.created_at
from public.project_versions pv
where not exists (
  select 1
  from public.builder_turns bt
  where bt.project_id = pv.project_id
)
order by pv.project_id, pv.version_number asc;
