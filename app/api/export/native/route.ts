import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { buildNativeZip, slugifyFilename, type PwaProjectInput } from '@/lib/pwa-generator';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import { canExportNative } from '@/lib/tier-config';
import type { ComponentBlueprint } from '@/lib/blueprint-schema';

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const { user, profile } = await getAuthenticatedProfile();
    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const tier = profile?.subscription_tier ?? 'free';
    const status = profile?.subscription_status ?? 'inactive';

    if (!canExportNative(tier, status)) {
      return NextResponse.json(
        {
          error: 'Native export requires an active Agency plan or above.',
          upgrade: true,
          tier,
        },
        { status: 403 }
      );
    }

    const { projectId } = await request.json();
    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const { supabase } = await getAuthenticatedProfile();
    const { data: project, error } = await supabase
      .from('projects')
      .select('id, title, prompt, generated_code, blueprint_json')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!project.generated_code?.trim() && !project.blueprint_json) {
      return NextResponse.json({ error: 'Project has no generated code to export' }, { status: 400 });
    }

    const pwaInput: PwaProjectInput = {
      id: project.id,
      title: project.title,
      prompt: project.prompt || '',
      generated_code: project.generated_code || '',
      blueprint_json: (project.blueprint_json as ComponentBlueprint | null) ?? null,
    };

    const zipBuffer = await buildNativeZip(pwaInput);
    const filename = `${slugifyFilename(project.title)}-native.zip`;

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to create native export');
  }
}
