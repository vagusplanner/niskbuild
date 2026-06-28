import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  fetchImportManifestFromStorage,
  fetchImportSourceZipFromStorage,
} from '@/lib/app-import/storage';
import type { NiskBuildImportManifest } from '@/lib/app-import/types';

export type AppImportRecord = {
  id: string;
  slug: string;
  title: string;
  status: string;
  storage_path: string | null;
  workspace_path: string | null;
  framework: string | null;
  manifest: NiskBuildImportManifest | null;
};

/** Load import row by slug (admin / server). */
export async function getAppImportBySlug(slug: string): Promise<AppImportRecord | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .schema('firstparty')
    .from('app_imports')
    .select('id, slug, title, status, storage_path, workspace_path, framework, manifest')
    .eq('slug', slug)
    .maybeSingle();

  if (error || !data) return null;
  return data as AppImportRecord;
}

/**
 * Canonical read path for imported app artifacts — Supabase Storage only.
 * Replaces any legacy reads from apps/imported/<slug>/ on disk.
 */
export async function readImportedAppFromStorage(slug: string): Promise<{
  manifest: NiskBuildImportManifest;
  sourceZip: Buffer;
}> {
  const record = await getAppImportBySlug(slug);
  if (!record?.storage_path) {
    throw new Error(`Import "${slug}" has no storage_path — re-import or run storage migration`);
  }
  if (record.status !== 'completed') {
    throw new Error(`Import "${slug}" is not completed (status: ${record.status})`);
  }

  const manifest = await fetchImportManifestFromStorage(slug);
  const sourceZip = await fetchImportSourceZipFromStorage(slug);
  return { manifest, sourceZip };
}

export async function readImportManifest(slug: string): Promise<NiskBuildImportManifest> {
  return fetchImportManifestFromStorage(slug);
}
