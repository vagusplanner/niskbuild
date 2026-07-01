-- Per-user Vagus Planner source overrides (VP builder edits on Vercel — no local disk writes)
-- Prerequisite: firstparty schema exposed in Supabase API settings

create table if not exists firstparty.vp_builder_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  app_id text not null default 'vagus-planner',
  relative_path text not null,
  content text not null,
  updated_at timestamptz not null default now(),
  constraint vp_builder_sources_user_app_path_unique
    unique (user_id, app_id, relative_path)
);

create index if not exists idx_vp_builder_sources_user_app
  on firstparty.vp_builder_sources (user_id, app_id, updated_at desc);

alter table firstparty.vp_builder_sources enable row level security;

drop policy if exists "Users manage own vp_builder_sources" on firstparty.vp_builder_sources;
create policy "Users manage own vp_builder_sources"
  on firstparty.vp_builder_sources for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on firstparty.vp_builder_sources to authenticated;
grant all on firstparty.vp_builder_sources to service_role;
