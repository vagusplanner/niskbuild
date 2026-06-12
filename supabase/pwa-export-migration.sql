-- PWA export tracking on metadata_logs
-- Run in Supabase SQL editor

alter table metadata_logs
  add column if not exists export_type text;

create index if not exists idx_metadata_logs_export_type
  on metadata_logs (export_type)
  where export_type is not null;
