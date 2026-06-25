import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { ProjectExportJobRecord, ProjectExportJobStatus } from '@/lib/project-export/types';

const LOG_MAX = 48_000;

function trimLog(log: string): string {
  if (log.length <= LOG_MAX) return log;
  return log.slice(log.length - LOG_MAX);
}

export function logTail(log: string, maxLines = 40): string {
  const lines = log.split('\n');
  if (lines.length <= maxLines) return log;
  return lines.slice(-maxLines).join('\n');
}

export async function createProjectExportJob(params: {
  projectId: string;
  userId: string;
}): Promise<ProjectExportJobRecord> {
  const db = createAdminClient();
  const { data, error } = await db
    .from('project_export_jobs')
    .insert({
      project_id: params.projectId,
      user_id: params.userId,
      status: 'pending',
      log: `[${new Date().toISOString()}] Export job queued\n`,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create export job');
  }

  await db
    .from('projects')
    .update({ export_status: 'pending' })
    .eq('id', params.projectId)
    .eq('user_id', params.userId);

  return data as ProjectExportJobRecord;
}

export async function getProjectExportJob(jobId: string): Promise<ProjectExportJobRecord | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from('project_export_jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle();

  if (error) {
    console.error('getProjectExportJob:', error.message);
    return null;
  }

  return (data as ProjectExportJobRecord) ?? null;
}

export async function appendProjectExportLog(jobId: string, chunk: string): Promise<void> {
  const job = await getProjectExportJob(jobId);
  if (!job) return;

  const db = createAdminClient();
  await db
    .from('project_export_jobs')
    .update({ log: trimLog(`${job.log}${chunk}`) })
    .eq('id', jobId);
}

export async function updateProjectExportJob(
  jobId: string,
  patch: Partial<{
    status: ProjectExportJobStatus;
    log: string;
    download_url: string | null;
    capacitor_root: string | null;
    ios_workspace: string | null;
    finished_at: string | null;
  }>,
  projectId?: string
): Promise<void> {
  const db = createAdminClient();
  const payload: Record<string, unknown> = { ...patch };
  if (typeof patch.log === 'string') {
    payload.log = trimLog(patch.log);
  }

  await db.from('project_export_jobs').update(payload).eq('id', jobId);

  if (projectId && patch.status) {
    const exportStatus =
      patch.status === 'ready'
        ? 'ready_for_xcode'
        : patch.status === 'failed'
          ? 'failed'
          : patch.status;
    await db.from('projects').update({ export_status: exportStatus }).eq('id', projectId);
  }
}

export async function failProjectExportJob(
  jobId: string,
  message: string,
  projectId?: string
): Promise<void> {
  const job = await getProjectExportJob(jobId);
  const log = trimLog(`${job?.log ?? ''}\n[${new Date().toISOString()}] ERROR: ${message}\n`);
  await updateProjectExportJob(
    jobId,
    {
      status: 'failed',
      log,
      finished_at: new Date().toISOString(),
    },
    projectId
  );
}
