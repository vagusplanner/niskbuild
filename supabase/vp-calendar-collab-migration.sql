-- Vagus Planner: calendar collaboration (edit presence/history, comments,
-- event attachments, edit locks, Google sync state, task shares).
-- Run in Supabase SQL Editor. Safe to re-run.
-- Prerequisite: firstparty schema, vp_events / vp_tasks / vp_holidays, public.is_platform_owner()

create schema if not exists firstparty;

-- ── Event edit presence + history ───────────────────────────────────────────
create table if not exists firstparty.vp_event_edits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references firstparty.vp_events(id) on delete cascade,
  kind text not null default 'presence'
    check (kind in ('presence', 'history')),
  editor_email text,
  editor_name text,
  field text,
  color text,
  cursor_position integer,
  selection_start integer,
  selection_end integer,
  last_active timestamptz not null default now(),
  previous_value text,
  new_value text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vp_event_edits_event
  on firstparty.vp_event_edits (event_id, kind, last_active desc);

create unique index if not exists idx_vp_event_edits_presence_unique
  on firstparty.vp_event_edits (event_id, editor_email, field)
  where kind = 'presence' and editor_email is not null and field is not null;

-- ── Comments (events, holidays, tasks, quran verses, …) ─────────────────────
create table if not exists firstparty.vp_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  content text not null default '',
  author_email text,
  author_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vp_comments_entity
  on firstparty.vp_comments (entity_type, entity_id, created_at);

-- ── Event attachments (storage path in uploads bucket) ──────────────────────
create table if not exists firstparty.vp_shared_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid references firstparty.vp_events(id) on delete cascade,
  chat_id text,
  file_name text not null,
  file_type text,
  file_size bigint,
  storage_path text,
  file_url text,
  storage_provider text not null default 'supabase',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vp_shared_files_event
  on firstparty.vp_shared_files (event_id, created_at desc);

-- ── Soft edit locks ─────────────────────────────────────────────────────────
create table if not exists firstparty.vp_event_locks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references firstparty.vp_events(id) on delete cascade,
  locked_by text not null,
  last_active timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vp_event_locks_event unique (event_id)
);

create index if not exists idx_vp_event_locks_event
  on firstparty.vp_event_locks (event_id, last_active desc);

-- ── Google (and other) sync status ──────────────────────────────────────────
create table if not exists firstparty.vp_sync_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service text not null,
  status text not null default 'idle',
  last_synced_at timestamptz,
  last_attempted_at timestamptz,
  last_error text,
  sync_token text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vp_sync_states_user_service unique (user_id, service)
);

-- ── Task shares ─────────────────────────────────────────────────────────────
create table if not exists firstparty.vp_task_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references firstparty.vp_tasks(id) on delete cascade,
  shared_by_email text,
  shared_with_email text not null,
  permission text not null default 'view'
    check (permission in ('view', 'edit')),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vp_task_shares_task
  on firstparty.vp_task_shares (task_id);
create index if not exists idx_vp_task_shares_with
  on firstparty.vp_task_shares (lower(shared_with_email));

alter table firstparty.vp_tasks
  add column if not exists assigned_to text,
  add column if not exists assigned_by text;

-- Allow common calendar attachment types on the existing private uploads bucket
do $$
begin
  update storage.buckets
  set allowed_mime_types = (
    select array(
      select distinct unnest(
        coalesce(allowed_mime_types, array[]::text[])
        || array[
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/zip',
          'text/calendar'
        ]
      )
    )
  )
  where id = 'uploads';
exception
  when undefined_table then null;
end $$;

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table firstparty.vp_event_edits enable row level security;
alter table firstparty.vp_comments enable row level security;
alter table firstparty.vp_shared_files enable row level security;
alter table firstparty.vp_event_locks enable row level security;
alter table firstparty.vp_sync_states enable row level security;
alter table firstparty.vp_task_shares enable row level security;

drop policy if exists "Users manage own vp_event_edits" on firstparty.vp_event_edits;
create policy "Users manage own vp_event_edits"
  on firstparty.vp_event_edits for all to authenticated
  using (
    auth.uid() = user_id
    or public.is_platform_owner()
    or exists (
      select 1 from firstparty.vp_events e
      where e.id = event_id and e.user_id = auth.uid()
    )
  )
  with check (auth.uid() = user_id or public.is_platform_owner());

drop policy if exists "Users manage vp_comments" on firstparty.vp_comments;
create policy "Users manage vp_comments"
  on firstparty.vp_comments for all to authenticated
  using (
    auth.uid() = user_id
    or public.is_platform_owner()
    or (
      entity_type = 'event' and exists (
        select 1 from firstparty.vp_events e
        where e.id::text = entity_id and e.user_id = auth.uid()
      )
    )
    or (
      entity_type = 'task' and exists (
        select 1 from firstparty.vp_tasks t
        where t.id::text = entity_id and t.user_id = auth.uid()
      )
    )
    or (
      entity_type in ('holiday', 'Holiday') and exists (
        select 1 from firstparty.vp_holidays h
        where h.id::text = entity_id and h.user_id = auth.uid()
      )
    )
    or exists (
      select 1 from firstparty.vp_task_shares s
      where s.task_id::text = entity_id
        and entity_type = 'task'
        and lower(s.shared_with_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  )
  with check (auth.uid() = user_id or public.is_platform_owner());

drop policy if exists "Users manage vp_shared_files" on firstparty.vp_shared_files;
create policy "Users manage vp_shared_files"
  on firstparty.vp_shared_files for all to authenticated
  using (
    auth.uid() = user_id
    or public.is_platform_owner()
    or exists (
      select 1 from firstparty.vp_events e
      where e.id = event_id and e.user_id = auth.uid()
    )
  )
  with check (auth.uid() = user_id or public.is_platform_owner());

drop policy if exists "Users manage vp_event_locks" on firstparty.vp_event_locks;
create policy "Users manage vp_event_locks"
  on firstparty.vp_event_locks for all to authenticated
  using (
    auth.uid() = user_id
    or public.is_platform_owner()
    or exists (
      select 1 from firstparty.vp_events e
      where e.id = event_id and e.user_id = auth.uid()
    )
  )
  with check (auth.uid() = user_id or public.is_platform_owner());

drop policy if exists "Users manage own vp_sync_states" on firstparty.vp_sync_states;
create policy "Users manage own vp_sync_states"
  on firstparty.vp_sync_states for all to authenticated
  using (auth.uid() = user_id or public.is_platform_owner())
  with check (auth.uid() = user_id or public.is_platform_owner());

drop policy if exists "Users manage vp_task_shares" on firstparty.vp_task_shares;
create policy "Users manage vp_task_shares"
  on firstparty.vp_task_shares for all to authenticated
  using (
    auth.uid() = user_id
    or public.is_platform_owner()
    or lower(shared_with_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  with check (auth.uid() = user_id or public.is_platform_owner());

grant select, insert, update, delete on firstparty.vp_event_edits to authenticated, service_role;
grant select, insert, update, delete on firstparty.vp_comments to authenticated, service_role;
grant select, insert, update, delete on firstparty.vp_shared_files to authenticated, service_role;
grant select, insert, update, delete on firstparty.vp_event_locks to authenticated, service_role;
grant select, insert, update, delete on firstparty.vp_sync_states to authenticated, service_role;
grant select, insert, update, delete on firstparty.vp_task_shares to authenticated, service_role;

-- Mention directory: current user + people they have shared tasks with / received
-- shares from + comment authors on their events/tasks/holidays. Does not dump all auth.users.
create or replace function public.vp_list_directory_users()
returns jsonb
language plpgsql
security definer
set search_path = public, firstparty, auth
as $$
declare
  my_email text;
  result jsonb;
begin
  if auth.uid() is null then
    return '[]'::jsonb;
  end if;

  select email into my_email from auth.users where id = auth.uid();

  with candidates as (
    select u.id, u.email::text as email,
      coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)) as full_name
    from auth.users u
    where u.id = auth.uid()

    union

    select u.id, u.email::text,
      coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1))
    from firstparty.vp_task_shares s
    join auth.users u on lower(u.email) = lower(s.shared_with_email)
    where s.user_id = auth.uid()

    union

    select u.id, u.email::text,
      coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1))
    from firstparty.vp_task_shares s
    join auth.users u on u.id = s.user_id
    where lower(s.shared_with_email) = lower(my_email)

    union

    select u.id, u.email::text,
      coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1))
    from firstparty.vp_comments c
    join auth.users u on lower(u.email) = lower(c.author_email)
    where c.user_id = auth.uid()
       or (
         c.entity_type = 'event' and exists (
           select 1 from firstparty.vp_events e
           where e.user_id = auth.uid() and e.id::text = c.entity_id
         )
       )
       or (
         c.entity_type = 'task' and exists (
           select 1 from firstparty.vp_tasks t
           where t.user_id = auth.uid() and t.id::text = c.entity_id
         )
       )
  ),
  pending as (
    select null::uuid as id, s.shared_with_email as email, split_part(s.shared_with_email, '@', 1) as full_name
    from firstparty.vp_task_shares s
    where s.user_id = auth.uid()
      and not exists (select 1 from auth.users u where lower(u.email) = lower(s.shared_with_email))
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'email', email, 'full_name', full_name)), '[]'::jsonb)
  into result
  from (
    select distinct on (lower(email)) id, email, full_name from (
      select * from candidates
      union all
      select * from pending
    ) x
    order by lower(email), id nulls last
  ) d;

  return coalesce(result, '[]'::jsonb);
end;
$$;

revoke all on function public.vp_list_directory_users() from public;
grant execute on function public.vp_list_directory_users() to authenticated, service_role;

-- Realtime (ignore if publication/table already added)
alter table firstparty.vp_event_edits replica identity full;
alter table firstparty.vp_comments replica identity full;
alter table firstparty.vp_event_locks replica identity full;
alter table firstparty.vp_shared_files replica identity full;

do $$
begin
  alter publication supabase_realtime add table firstparty.vp_event_edits;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table firstparty.vp_comments;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table firstparty.vp_event_locks;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table firstparty.vp_shared_files;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
