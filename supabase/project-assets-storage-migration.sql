-- Project assets bucket (Figma screenshot imports, company social Instagram media, etc.)
-- Run in Supabase SQL editor (production + staging), then confirm under Storage → project-assets.
-- Must be public: Buffer (and Figma vision) fetch media via getPublicUrl.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-assets',
  'project-assets',
  true,
  -- 50MB — Instagram reels / company social video; Figma screenshots are well under this
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
