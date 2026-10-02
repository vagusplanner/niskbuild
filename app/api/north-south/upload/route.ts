import { NextRequest } from 'next/server';
import { captureApiException } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  nsApiCorsPreflightResponse,
  nsApiJson,
  withNsApiCors,
} from '@/lib/ns-api-cors';

export const maxDuration = 60;

const BUCKET = 'uploads';
const MAX_BYTES = 25 * 1024 * 1024;

export async function OPTIONS(request: NextRequest) {
  return nsApiCorsPreflightResponse(request);
}

/**
 * POST /api/north-south/upload
 * multipart form: file=<blob>
 * Stores under ns/{userId}/files/... in the shared private `uploads` bucket
 * (service role — RLS first-segment is userId for client uploads; ns/ prefix
 * requires admin to avoid colliding with VP `{userId}/files/...` paths).
 */
export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 20 });
  if (!guard.ok) return withNsApiCors(request, guard.response);

  const userId = guard.user!.id;

  try {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return nsApiJson(request, { error: 'Invalid form body' }, { status: 400 });
    }

    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return nsApiJson(request, { error: 'file is required' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return nsApiJson(request, { error: 'File is too large (max 25MB)' }, { status: 400 });
    }

    const name =
      file.name ||
      (file.type?.includes('mp4') ? `audio_${Date.now()}.m4a` : `upload_${Date.now()}.bin`);
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `ns/${userId}/files/${Date.now()}_${safeName}`;

    const admin = createAdminClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    const { data, error } = await admin.storage.from(BUCKET).upload(path, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });
    if (error) {
      return nsApiJson(
        request,
        { error: error.message || 'Upload failed' },
        { status: 500 }
      );
    }

    const { data: signed, error: signError } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(data.path, 3600);
    if (signError || !signed?.signedUrl) {
      return nsApiJson(
        request,
        { error: 'Could not create signed URL for uploaded file' },
        { status: 500 }
      );
    }

    return nsApiJson(request, {
      path: data.path,
      fullPath: data.fullPath,
      id: data.id,
      file_url: signed.signedUrl,
      storage_path: data.path,
    });
  } catch (error) {
    captureApiException(error);
    const message = error instanceof Error ? error.message : 'Upload failed';
    return nsApiJson(request, { error: message }, { status: 500 });
  }
}
