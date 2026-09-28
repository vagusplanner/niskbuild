-- File 1/5 — platform-owner stub (sandbox only).
-- What: creates firstparty.platform_owners + public.is_platform_owner() if missing.
-- Expect: Success. No result rows (DDL). Optionally replace function body with prod pg_get_functiondef first.
-- Re-run: Safe (IF NOT EXISTS / CREATE OR REPLACE). Skip if already present on sandbox.
-- Do NOT run on production.

create schema if not exists firstparty;

create table if not exists firstparty.platform_owners (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- >>> PASTE real public.is_platform_owner() here (pg_get_functiondef from prod) <<<
create or replace function public.is_platform_owner()
returns boolean
language sql
stable
security definer
set search_path = public, firstparty
as $$
  select exists (
    select 1
    from firstparty.platform_owners po
    where po.user_id = auth.uid()
  );
$$;

revoke all on function public.is_platform_owner() from public;
grant execute on function public.is_platform_owner() to authenticated, service_role;

-- Optional:
-- insert into firstparty.platform_owners (user_id)
-- select id from auth.users where lower(email) = lower('you@example.com')
-- on conflict (user_id) do nothing;
