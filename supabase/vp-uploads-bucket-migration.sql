-- Vagus Planner private uploads bucket (voice memos, attachments, profile images)
-- Prerequisite: Supabase Auth enabled
-- Run in Supabase SQL Editor when ready.
--
-- Objects are stored as: {user_id}/files/{timestamp}_{filename}
-- RLS restricts each user to their own prefix. Access is via signed URLs only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'uploads',
  'uploads',
  false,
  26214400,
  array[
    'audio/webm',
    'audio/mp4',
    'audio/m4a',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/x-m4a',
    'audio/x-wav',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/octet-stream'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Users upload only into their own folder prefix
drop policy if exists "Users upload own uploads objects" on storage.objects;
create policy "Users upload own uploads objects"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users read their own objects (required for createSignedUrl on client)
drop policy if exists "Users read own uploads objects" on storage.objects;
create policy "Users read own uploads objects"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users may update/replace their own objects
drop policy if exists "Users update own uploads objects" on storage.objects;
create policy "Users update own uploads objects"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users may delete their own objects
drop policy if exists "Users delete own uploads objects" on storage.objects;
create policy "Users delete own uploads objects"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Service role bypasses RLS for server-side maintenance / admin signed URLs
drop policy if exists "Service role manages uploads objects" on storage.objects;
create policy "Service role manages uploads objects"
  on storage.objects for all
  to service_role
  using (bucket_id = 'uploads')
  with check (bucket_id = 'uploads');
