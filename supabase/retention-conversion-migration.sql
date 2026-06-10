-- Retention & conversion: credit alerts + shareable preview links

alter table profiles
  add column if not exists credit_alert_80_sent boolean default false,
  add column if not exists credit_alert_100_sent boolean default false,
  add column if not exists preview_restore_count integer default 0;

create table if not exists previews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  title text,
  html_content text not null,
  is_active boolean not null default true,
  expired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_previews_user on previews (user_id, is_active);
create index if not exists idx_previews_token on previews (token) where is_active = true;

alter table previews enable row level security;
create policy "No direct client access to previews"
  on previews for all using (false) with check (false);
