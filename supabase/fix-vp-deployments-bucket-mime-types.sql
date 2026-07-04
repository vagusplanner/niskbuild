-- Fix vp-deployments bucket MIME rejections during VP deploy publish.
--
-- Problem: vp-deployments-storage-migration.sql allowed bare types (e.g.
-- 'application/javascript') but publishDistToStorageFromDir() uploads with
-- charset parameters (e.g. 'application/javascript; charset=utf-8' from
-- contentTypeFor()). Supabase Storage matches the full Content-Type string,
-- so .js uploads failed with "mime type application/javascript; charset=utf-8
-- is not supported".
--
-- Real Vite dist (apps/vagus-planner/dist after build): .js, .css, .html only
-- (48 files in a typical build). Bucket list omitted charset suffixes and would
-- also block future assets (fonts, images) if added to the app.
--
-- Fix: drop MIME allowlist for this bucket. Uploads are service-role only from
-- our deploy pipeline (controlled build output), not arbitrary user uploads.
-- Public read is intentional for preview iframe bundle URLs.

update storage.buckets
set allowed_mime_types = null
where id = 'vp-deployments';
