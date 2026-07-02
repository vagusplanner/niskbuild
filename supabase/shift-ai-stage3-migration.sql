-- Shift AI Stage 3 — homework photo uploads + retention
-- Prerequisite: shift-ai-foundation + auth migrations
-- Run in Supabase SQL Editor when ready.

-- ─── Homework uploads ────────────────────────────────────────────────────

create table if not exists firstparty.shift_homework_uploads (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references firstparty.shift_students(id) on delete cascade,
  subject text,
  storage_path text not null,
  ai_response text,
  uploaded_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '48 hours'),
  extended_until timestamptz
);

create index if not exists idx_shift_homework_uploads_student_uploaded
  on firstparty.shift_homework_uploads (student_id, uploaded_at desc);

create index if not exists idx_shift_homework_uploads_expires
  on firstparty.shift_homework_uploads (expires_at);

comment on table firstparty.shift_homework_uploads is
  'Ephemeral homework photo uploads for Snap Homework / Homework Scanner — 48h default retention.';

-- ─── Row level security ───────────────────────────────────────────────────

alter table firstparty.shift_homework_uploads enable row level security;

drop policy if exists "Students manage own shift_homework_uploads" on firstparty.shift_homework_uploads;
create policy "Students manage own shift_homework_uploads"
  on firstparty.shift_homework_uploads for all
  to authenticated
  using (
    exists (
      select 1
      from firstparty.shift_students s
      where s.id = shift_homework_uploads.student_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from firstparty.shift_students s
      where s.id = shift_homework_uploads.student_id
        and s.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on firstparty.shift_homework_uploads to authenticated;
grant all on firstparty.shift_homework_uploads to service_role;

grant usage on schema firstparty to authenticated, service_role;

-- ─── Private storage bucket (signed URL access only) ─────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shift-homework-uploads',
  'shift-homework-uploads',
  false,
  10485760,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Service role manages objects; students access photos via server-generated signed URLs only.
drop policy if exists "Service role manages shift-homework-uploads" on storage.objects;
create policy "Service role manages shift-homework-uploads"
  on storage.objects for all
  to service_role
  using (bucket_id = 'shift-homework-uploads')
  with check (bucket_id = 'shift-homework-uploads');
