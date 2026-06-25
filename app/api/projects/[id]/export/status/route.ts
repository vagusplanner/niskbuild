import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { getProjectExportJob, logTail } from '@/lib/project-export/jobs';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import type { ProjectExportChecklist } from '@/lib/project-export/types';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const guard = await guardApiRequest(request, { rateLimit: 120 });
  if (!guard.ok) return guard.response;

  const { id: projectId } = await context.params;
  const jobId = request.nextUrl.searchParams.get('jobId');

  const { user, supabase } = await getAuthenticatedProfile();
  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  if (!jobId) {
    const { data: project } = await supabase
      .from('projects')
      .select('title, bundle_id, icon_url, privacy_policy_url')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const checklist: ProjectExportChecklist = {
      bundleId: project.bundle_id ?? null,
      bundleIdSet: Boolean(project.bundle_id?.trim()),
      iconUrl: project.icon_url ?? null,
      iconUploaded: Boolean(project.icon_url?.trim()),
      privacyPolicyUrl: project.privacy_policy_url ?? null,
      privacyPolicySet: Boolean(project.privacy_policy_url?.trim()),
    };

    return NextResponse.json({ checklist, projectTitle: project.title });
  }

  const job = await getProjectExportJob(jobId);
  if (!job || job.project_id !== projectId) {
    return NextResponse.json({ error: 'Export job not found' }, { status: 404 });
  }

  if (job.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    logTail: logTail(job.log),
    downloadUrl: job.download_url,
    capacitorRoot: job.capacitor_root,
    iosWorkspace: job.ios_workspace,
    startedAt: job.started_at,
    finishedAt: job.finished_at,
  });
}
