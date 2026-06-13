-- Prompt 9: profile preferences for Settings page

alter table profiles
  add column if not exists full_name text,
  add column if not exists avatar_url text,
  add column if not exists timezone text default 'Europe/London',
  add column if not exists language text default 'en',
  add column if not exists metadata_opt_in boolean default true,
  add column if not exists credits_reset_at timestamptz,
  add column if not exists reload_credits_expires_at timestamptz;

-- Avatars bucket (public read) — create in Supabase Dashboard → Storage if not exists
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
