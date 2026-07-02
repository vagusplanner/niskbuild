import 'server-only';

import { randomUUID } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  STORAGE_BUCKET_SHIFT_HOMEWORK_UPLOADS,
  shiftHomeworkUploadObjectPath,
} from '@/lib/storage/constants';
import {
  createStorageSignedUrl,
  removeStorageObjects,
  uploadStorageObject,
} from '@/lib/storage/supabase-storage';

export const HOMEWORK_DEFAULT_RETENTION_HOURS = 48;
export const HOMEWORK_MAX_RETENTION_DAYS = 30;
export const HOMEWORK_SIGNED_URL_EXPIRES_SEC = 3600;

export type HomeworkUploadRow = {
  id: string;
  student_id: string;
  subject: string | null;
  storage_path: string;
  ai_response: string | null;
  uploaded_at: string;
  expires_at: string;
  extended_until: string | null;
};

function maxRetentionDeadline(uploadedAtIso: string): Date {
  const maxUntil = new Date(uploadedAtIso);
  maxUntil.setUTCDate(maxUntil.getUTCDate() + HOMEWORK_MAX_RETENTION_DAYS);
  return maxUntil;
}

export async function uploadHomeworkPhoto(
  studentId: string,
  subject: string | null,
  imageBuffer: Buffer,
  contentType = 'image/jpeg'
): Promise<{ id: string; storagePath: string }> {
  const admin = createAdminClient();
  const id = randomUUID();
  const storagePath = shiftHomeworkUploadObjectPath(studentId, id);

  await uploadStorageObject({
    bucket: STORAGE_BUCKET_SHIFT_HOMEWORK_UPLOADS,
    objectPath: storagePath,
    body: imageBuffer,
    contentType,
    upsert: false,
  });

  const { data, error } = await admin
    .schema('firstparty')
    .from('shift_homework_uploads')
    .insert({
      id,
      student_id: studentId,
      subject: subject?.trim() || null,
      storage_path: storagePath,
    })
    .select('id, storage_path')
    .single();

  if (error || !data) {
    try {
      await removeStorageObjects(STORAGE_BUCKET_SHIFT_HOMEWORK_UPLOADS, [storagePath]);
    } catch (cleanupErr) {
      console.error('Shift AI homework upload rollback failed:', cleanupErr);
    }
    throw new Error(`Could not save homework upload record: ${error?.message ?? 'unknown'}`);
  }

  return { id: data.id, storagePath: data.storage_path };
}

export async function getHomeworkPhotoUrl(uploadId: string): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .schema('firstparty')
    .from('shift_homework_uploads')
    .select('storage_path')
    .eq('id', uploadId)
    .maybeSingle();

  if (error || !data?.storage_path) {
    throw new Error('Homework upload not found');
  }

  return createStorageSignedUrl(
    STORAGE_BUCKET_SHIFT_HOMEWORK_UPLOADS,
    data.storage_path,
    HOMEWORK_SIGNED_URL_EXPIRES_SEC
  );
}

export async function extendHomeworkRetention(
  uploadId: string,
  additionalDays: number
): Promise<HomeworkUploadRow> {
  if (!Number.isFinite(additionalDays) || additionalDays <= 0) {
    throw new Error('additionalDays must be a positive number');
  }

  const admin = createAdminClient();
  const { data: row, error: fetchError } = await admin
    .schema('firstparty')
    .from('shift_homework_uploads')
    .select('id, student_id, subject, storage_path, ai_response, uploaded_at, expires_at, extended_until')
    .eq('id', uploadId)
    .maybeSingle();

  if (fetchError || !row) {
    throw new Error('Homework upload not found');
  }

  const maxUntil = maxRetentionDeadline(row.uploaded_at);
  const base = new Date(row.extended_until ?? row.expires_at);
  const proposed = new Date(base);
  proposed.setUTCDate(proposed.getUTCDate() + Math.round(additionalDays));

  if (proposed.getTime() > maxUntil.getTime()) {
    throw new Error(
      `Cannot extend retention beyond ${HOMEWORK_MAX_RETENTION_DAYS} days from upload`
    );
  }

  const { data, error } = await admin
    .schema('firstparty')
    .from('shift_homework_uploads')
    .update({ extended_until: proposed.toISOString() })
    .eq('id', uploadId)
    .select('id, student_id, subject, storage_path, ai_response, uploaded_at, expires_at, extended_until')
    .single();

  if (error || !data) {
    throw new Error(`Could not extend homework retention: ${error?.message ?? 'unknown'}`);
  }

  return data as HomeworkUploadRow;
}

export async function processShiftAiHomeworkPhotoCleanup(): Promise<{
  scanned: number;
  deleted: number;
  storageErrors: number;
  dbErrors: number;
}> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: rows, error } = await admin
    .schema('firstparty')
    .from('shift_homework_uploads')
    .select('id, storage_path, extended_until')
    .lt('expires_at', now);

  if (error) {
    throw new Error(`Homework cleanup query failed: ${error.message}`);
  }

  const expired = (rows ?? []).filter((row) => {
    if (!row.extended_until) return true;
    return new Date(row.extended_until).getTime() < Date.now();
  });

  let deleted = 0;
  let storageErrors = 0;
  let dbErrors = 0;

  for (const row of expired) {
    try {
      await removeStorageObjects(STORAGE_BUCKET_SHIFT_HOMEWORK_UPLOADS, [row.storage_path]);
    } catch (err) {
      storageErrors += 1;
      console.error(`Shift AI homework storage delete failed (${row.id}):`, err);
    }

    const { error: deleteError } = await admin
      .schema('firstparty')
      .from('shift_homework_uploads')
      .delete()
      .eq('id', row.id);

    if (deleteError) {
      dbErrors += 1;
      console.error(`Shift AI homework row delete failed (${row.id}):`, deleteError.message);
      continue;
    }

    deleted += 1;
  }

  return {
    scanned: expired.length,
    deleted,
    storageErrors,
    dbErrors,
  };
}
