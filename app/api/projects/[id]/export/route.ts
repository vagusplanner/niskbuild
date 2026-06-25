import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { createProjectExportJob } from '@/lib/project-export/jobs';
import { startProjectExportJob } from '@/lib/project-export/run-export';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import { canExportMobileProject } from '@/lib/tier-config';
import type { ComponentBlueprint } from '@/lib/blueprint-schema';

export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const guard = await guardApiRequest(request, { rateLimit: 3 });
  if (!guard.ok) return guard.response;

  try {
    const { id: projectId } = await context.params;
    const { user, profile, supabase } = await getAuthenticatedProfile();
    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const tier = profile?.subscription_tier ?? 'free';
    const subscriptionStatus = profile?.subscription_status ?? 'inactive';

    if (!canExportMobileProject(tier, subscriptionStatus)) {
      return NextResponse.json(
        {
          error: 'Mobile export is a Pro feature. Upgrade to Pro Worker to export to the App Store.',
          upgrade: true,
          requiredTier: 'pro',
        },
        { status: 403 }
      );
    }

    const { data: project, error } = await supabase
      .from('projects')
      .select('id, title, prompt, generated_code, blueprint_json, bundle_id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!project.generated_code?.trim() && !project.blueprint_json) {
      return NextResponse.json(
        { error: 'Project has no generated code to export' },
        { status: 400 }
      );
    }

    const job = await createProjectExportJob({
      projectId: project.id,
      userId: user.id,
    });

    const downloadApiPath = `/api/projects/${projectId}/export/download?jobId=${job.id}`;

    startProjectExportJob(
      job.id,
      {
        id: project.id,
        title: project.title,
        prompt: project.prompt || '',
        generated_code: project.generated_code || '',
        blueprint_json: (project.blueprint_json as ComponentBlueprint | null) ?? null,
        bundle_id: (project.bundle_id as string | null) ?? null,
      },
      downloadApiPath
    );

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      message: 'Export started. Poll /export/status for progress.',
    });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to start export');
  }
}
