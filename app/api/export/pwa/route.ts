import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { logPwaExport } from '@/lib/log-pwa-export';
import { buildPwaZip, slugifyFilename, type PwaProjectInput } from '@/lib/pwa-generator';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import { canExportPwa } from '@/lib/tier-config';
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

    if (!canExportPwa(tier, status)) {
      return NextResponse.json(
        {
          error: 'PWA export requires an active Pro plan or above.',
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

    const zipBuffer = await buildPwaZip(pwaInput);
    const filename = `${slugifyFilename(project.title)}-pwa.zip`;

    await logPwaExport({
      userId: user.id,
      sessionId: projectId,
      subscriptionTier: tier,
      appCategory: pwaInput.blueprint_json?.meta?.type || 'webapp',
    });

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to create PWA export');
  }
}
