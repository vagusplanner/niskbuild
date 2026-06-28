import 'server-only';

import {
  STORAGE_BUCKET_PROJECT_EXPORTS,
  projectExportZipObjectPath,
} from '@/lib/storage/constants';
import { createStorageSignedUrl, uploadStorageObject } from '@/lib/storage/supabase-storage';

export async function uploadProjectExportZip(params: {
  userId: string;
  projectId: string;
  jobId: string;
  zipBuffer: Buffer;
}): Promise<string> {
  const objectPath = projectExportZipObjectPath(params.userId, params.projectId, params.jobId);
  await uploadStorageObject({
    bucket: STORAGE_BUCKET_PROJECT_EXPORTS,
    objectPath,
    body: params.zipBuffer,
    contentType: 'application/zip',
  });
  return objectPath;
}

export async function createProjectExportSignedUrl(
  storagePath: string,
  expiresInSeconds = 3600
): Promise<string> {
  return createStorageSignedUrl(STORAGE_BUCKET_PROJECT_EXPORTS, storagePath, expiresInSeconds);
}
