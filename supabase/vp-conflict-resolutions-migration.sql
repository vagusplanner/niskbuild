-- Calendar conflict resolution records (ConflictResolutionModal / UnifiedCalendarView)
-- Previously referenced in base44-compat but table was never created.

create table if not exists firstparty.vp_conflict_resolutions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'resolved', 'ignored')),
  event1_id uuid,
  event2_id uuid,
  event1_title text,
  event2_title text,
  conflict_date timestamptz,
  ai_suggestions jsonb not null default '[]'::jsonb,
  user_decision text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vp_conflict_resolutions_user_status
  on firstparty.vp_conflict_resolutions (user_id, status, created_at desc);

alter table firstparty.vp_conflict_resolutions enable row level security;

drop policy if exists "Users manage own vp_conflict_resolutions" on firstparty.vp_conflict_resolutions;
create policy "Users manage own vp_conflict_resolutions"
  on firstparty.vp_conflict_resolutions for all
  to authenticated
  using (auth.uid() = user_id or public.is_platform_owner())
  with check (auth.uid() = user_id or public.is_platform_owner());

grant select, insert, update, delete on table firstparty.vp_conflict_resolutions to authenticated, service_role;
