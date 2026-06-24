-- Public bucket for Vagus Planner static deploy bundles (used by /api/builder/vagus-planner/deploy)
-- Run in Supabase SQL editor, then confirm bucket exists under Storage.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vp-deployments',
  'vp-deployments',
  true,
  52428800,
  array[
    'text/html',
    'text/css',
    'application/javascript',
    'application/json',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
    'image/x-icon',
    'font/woff',
    'font/woff2',
    'application/octet-stream'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
