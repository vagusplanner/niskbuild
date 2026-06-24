import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type {
  AppStoreChecklist,
  ExportJobRecord,
  ExportJobStatus,
} from '@/lib/builder-export/types';

const LOG_MAX = 48_000;

function trimLog(log: string): string {
  if (log.length <= LOG_MAX) return log;
  return log.slice(log.length - LOG_MAX);
}

export async function resolveAppRegistryId(appSlug: string): Promise<string | null> {
  const db = createAdminClient();
  const { data } = await db
    .schema('firstparty')
    .from('app_registry')
    .select('id')
    .eq('app_slug', appSlug)
    .maybeSingle();

  if (data?.id) return data.id;

  const { data: byName } = await db
    .schema('firstparty')
    .from('app_registry')
    .select('id, app_name')
    .ilike('app_name', appSlug.replace(/-/g, ' '))
    .maybeSingle();

  return byName?.id ?? null;
}

export async function createExportJob(params: {
  appSlug: string;
  requestedBy: string;
}): Promise<ExportJobRecord> {
  const db = createAdminClient();
  const appRegistryId = await resolveAppRegistryId(params.appSlug);

  const { data, error } = await db
    .schema('firstparty')
    .from('export_jobs')
    .insert({
      app_slug: params.appSlug,
      app_registry_id: appRegistryId,
      requested_by: params.requestedBy,
      status: 'building',
      log: `[${new Date().toISOString()}] Export job created\n`,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create export job');
  }

  return data as ExportJobRecord;
}

export async function getExportJob(jobId: string): Promise<ExportJobRecord | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .schema('firstparty')
    .from('export_jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle();

  if (error) {
    console.error('getExportJob:', error.message);
    return null;
  }

  return (data as ExportJobRecord) ?? null;
}

export async function appendExportJobLog(jobId: string, chunk: string): Promise<void> {
  const job = await getExportJob(jobId);
  if (!job) return;

  const db = createAdminClient();
  await db
    .schema('firstparty')
    .from('export_jobs')
    .update({ log: trimLog(`${job.log}${chunk}`) })
    .eq('id', jobId);
}

export async function updateExportJob(
  jobId: string,
  patch: Partial<{
    status: ExportJobStatus;
    log: string;
    capacitor_root: string;
    ios_workspace: string;
    finished_at: string;
  }>
): Promise<void> {
  const db = createAdminClient();
  const payload: Record<string, unknown> = { ...patch };
  if (typeof patch.log === 'string') {
    payload.log = trimLog(patch.log);
  }

  await db.schema('firstparty').from('export_jobs').update(payload).eq('id', jobId);
}

export async function failExportJob(jobId: string, message: string): Promise<void> {
  const job = await getExportJob(jobId);
  const log = trimLog(`${job?.log ?? ''}\n[${new Date().toISOString()}] ERROR: ${message}\n`);
  await updateExportJob(jobId, {
    status: 'failed',
    log,
    finished_at: new Date().toISOString(),
  });
}

export async function fetchAppStoreChecklist(appSlug: string): Promise<AppStoreChecklist | null> {
  const db = createAdminClient();

  let { data: row } = await db
    .schema('firstparty')
    .from('app_registry')
    .select(
      'app_name, app_slug, bundle_id, app_icon_url, privacy_policy_url, app_store_screenshots'
    )
    .eq('app_slug', appSlug)
    .maybeSingle();

  if (!row) {
    const configName = appSlug.replace(/-/g, ' ');
    const fallback = await db
      .schema('firstparty')
      .from('app_registry')
      .select(
        'app_name, app_slug, bundle_id, app_icon_url, privacy_policy_url, app_store_screenshots'
      )
      .ilike('app_name', configName)
      .maybeSingle();
    row = fallback.data;
  }

  if (!row) return null;

  const screenshots = Array.isArray(row.app_store_screenshots)
    ? row.app_store_screenshots
    : [];
  const bundleId = (row.bundle_id as string | null) ?? null;

  return {
    appSlug,
    appName: row.app_name as string,
    bundleId,
    bundleIdSet: Boolean(bundleId?.trim()),
    appIconUrl: (row.app_icon_url as string | null) ?? null,
    appIconUploaded: Boolean((row.app_icon_url as string | null)?.trim()),
    privacyPolicyUrl: (row.privacy_policy_url as string | null) ?? null,
    privacyPolicySet: Boolean((row.privacy_policy_url as string | null)?.trim()),
    screenshotCount: screenshots.length,
    appStoreScreenshotsUploaded: screenshots.length > 0,
    appStoreConnectUrl: bundleId
      ? 'https://appstoreconnect.apple.com/apps'
      : null,
  };
}

export function logTail(log: string, maxLines = 40): string {
  const lines = log.split('\n');
  if (lines.length <= maxLines) return log;
  return lines.slice(-maxLines).join('\n');
}
