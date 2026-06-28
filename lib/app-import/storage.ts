import 'server-only';

import {
  STORAGE_BUCKET_IMPORTED_APPS,
  importedAppManifestObjectPath,
  importedAppSourceObjectPath,
} from '@/lib/storage/constants';
import {
  createStorageSignedUrl,
  downloadStorageObject,
  uploadStorageObject,
} from '@/lib/storage/supabase-storage';
import type { NiskBuildImportManifest } from '@/lib/app-import/types';

export async function uploadImportedAppToStorage(params: {
  slug: string;
  sourceZip: Buffer;
  manifest: NiskBuildImportManifest;
}): Promise<{ sourcePath: string; manifestPath: string }> {
  const sourcePath = importedAppSourceObjectPath(params.slug);
  const manifestPath = importedAppManifestObjectPath(params.slug);

  await uploadStorageObject({
    bucket: STORAGE_BUCKET_IMPORTED_APPS,
    objectPath: sourcePath,
    body: params.sourceZip,
    contentType: 'application/zip',
  });

  await uploadStorageObject({
    bucket: STORAGE_BUCKET_IMPORTED_APPS,
    objectPath: manifestPath,
    body: JSON.stringify(params.manifest, null, 2),
    contentType: 'application/json',
  });

  return { sourcePath, manifestPath };
}

export async function fetchImportManifestFromStorage(slug: string): Promise<NiskBuildImportManifest> {
  const raw = await downloadStorageObject(
    STORAGE_BUCKET_IMPORTED_APPS,
    importedAppManifestObjectPath(slug)
  );
  return JSON.parse(raw.toString('utf8')) as NiskBuildImportManifest;
}

export async function fetchImportSourceZipFromStorage(slug: string): Promise<Buffer> {
  return downloadStorageObject(STORAGE_BUCKET_IMPORTED_APPS, importedAppSourceObjectPath(slug));
}

export async function createImportSourceSignedUrl(slug: string, expiresInSeconds = 3600): Promise<string> {
  return createStorageSignedUrl(
    STORAGE_BUCKET_IMPORTED_APPS,
    importedAppSourceObjectPath(slug),
    expiresInSeconds
  );
}
