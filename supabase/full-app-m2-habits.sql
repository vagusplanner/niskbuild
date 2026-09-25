-- Full App Pattern A: habits table + Data API grants + RLS
-- Safe to re-run. Use when "Automatically expose new tables" is OFF.

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists habits_user_id_idx on public.habits (user_id);

-- Required for PostgREST / supabase-js when auto-expose is OFF.
-- GRANTs are checked BEFORE RLS; missing grants → "permission denied for table habits".
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.habits to authenticated;
grant select, insert, update, delete on table public.habits to service_role;

alter table public.habits enable row level security;

drop policy if exists "habits_select_own" on public.habits;
create policy "habits_select_own"
  on public.habits for select
  using (auth.uid() = user_id);

drop policy if exists "habits_insert_own" on public.habits;
create policy "habits_insert_own"
  on public.habits for insert
  with check (auth.uid() = user_id);

drop policy if exists "habits_update_own" on public.habits;
create policy "habits_update_own"
  on public.habits for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "habits_delete_own" on public.habits;
create policy "habits_delete_own"
  on public.habits for delete
  using (auth.uid() = user_id);
