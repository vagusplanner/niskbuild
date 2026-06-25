import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { fetchAppStoreChecklist, getExportJob, logTail } from '@/lib/builder-export/jobs';
import { isExportSupported } from '@/lib/builder-export/config';
import { isPlatformOwner } from '@/lib/platform-owner-auth';

type RouteContext = { params: Promise<{ id: string }> };

async function canReadJob(
  job: NonNullable<Awaited<ReturnType<typeof getExportJob>>>,
  userId: string
): Promise<boolean> {
  if (job.requested_by === userId) return true;
  return isPlatformOwner();
}

export async function GET(request: NextRequest, context: RouteContext) {
  const guard = await guardApiRequest(request, { rateLimit: 120 });
  if (!guard.ok) return guard.response;

  const { id: appId } = await context.params;

  if (!isExportSupported(appId)) {
    return NextResponse.json({ error: 'Export is not supported for this app' }, { status: 404 });
  }

  const jobId = request.nextUrl.searchParams.get('jobId');
  const user = guard.user;

  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  if (!jobId) {
    const checklist = await fetchAppStoreChecklist(appId);
    return NextResponse.json({ checklist });
  }

  const job = await getExportJob(jobId);
  if (!job || job.app_slug !== appId) {
    return NextResponse.json({ error: 'Export job not found' }, { status: 404 });
  }

  if (!(await canReadJob(job, user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    logTail: logTail(job.log),
    capacitorRoot: job.capacitor_root,
    iosWorkspace: job.ios_workspace,
    startedAt: job.started_at,
    finishedAt: job.finished_at,
  });
}
