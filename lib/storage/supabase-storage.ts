import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export async function uploadStorageObject(params: {
  bucket: string;
  objectPath: string;
  body: Buffer | string;
  contentType: string;
  upsert?: boolean;
}): Promise<string> {
  const admin = createAdminClient();
  const { error } = await admin.storage.from(params.bucket).upload(params.objectPath, params.body, {
    contentType: params.contentType,
    upsert: params.upsert ?? true,
  });

  if (error) {
    throw new Error(`Storage upload failed (${params.bucket}/${params.objectPath}): ${error.message}`);
  }

  return params.objectPath;
}

export async function downloadStorageObject(bucket: string, objectPath: string): Promise<Buffer> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(bucket).download(objectPath);

  if (error || !data) {
    throw new Error(`Storage download failed (${bucket}/${objectPath}): ${error?.message ?? 'empty'}`);
  }

  return Buffer.from(await data.arrayBuffer());
}

export async function createStorageSignedUrl(
  bucket: string,
  objectPath: string,
  expiresInSeconds = 3600
): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(objectPath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(`Signed URL failed (${bucket}/${objectPath}): ${error?.message ?? 'missing url'}`);
  }

  return data.signedUrl;
}

export async function storageObjectExists(bucket: string, objectPath: string): Promise<boolean> {
  const admin = createAdminClient();
  const folder = objectPath.includes('/') ? objectPath.slice(0, objectPath.lastIndexOf('/')) : '';
  const name = objectPath.includes('/') ? objectPath.slice(objectPath.lastIndexOf('/') + 1) : objectPath;

  const { data, error } = await admin.storage.from(bucket).list(folder, {
    search: name,
    limit: 1,
  });

  if (error) return false;
  return (data ?? []).some((row) => row.name === name);
}
