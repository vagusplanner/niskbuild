import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { getProjectExportJob } from '@/lib/project-export/jobs';
import { projectExportArtifactPath } from '@/lib/project-export/run-export';
import { slugifyFilename } from '@/lib/pwa-generator';
import { downloadStorageObject } from '@/lib/storage/supabase-storage';
import { STORAGE_BUCKET_PROJECT_EXPORTS } from '@/lib/storage/constants';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import fs from 'fs/promises';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const { id: projectId } = await context.params;
  const jobId = request.nextUrl.searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
  }

  const { user, supabase } = await getAuthenticatedProfile();
  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const job = await getProjectExportJob(jobId);
  if (!job || job.project_id !== projectId || job.user_id !== user.id) {
    return NextResponse.json({ error: 'Export job not found' }, { status: 404 });
  }

  if (job.status !== 'ready' && job.status !== 'ready_zip_only') {
    return NextResponse.json({ error: 'Export is not ready yet' }, { status: 409 });
  }

  const { data: project } = await supabase
    .from('projects')
    .select('title')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .maybeSingle();

  const filename = `${slugifyFilename(project?.title || 'niskbuild-app')}-native-export.zip`;

  if (job.storage_path) {
    const buffer = await downloadStorageObject(STORAGE_BUCKET_PROJECT_EXPORTS, job.storage_path);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  }

  try {
    const buffer = await fs.readFile(projectExportArtifactPath(jobId));
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Export file not found' }, { status: 404 });
  }
}
