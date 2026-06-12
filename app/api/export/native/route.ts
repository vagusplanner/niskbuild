import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { buildNativeZip, slugifyFilename, type PwaProjectInput } from '@/lib/pwa-generator';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import { canExportNative } from '@/lib/tier-config';
import type { ComponentBlueprint } from '@/lib/blueprint-schema';

type InlineExportBody = {
  title: string;
  prompt: string;
  generated_code: string;
  blueprint_json?: ComponentBlueprint | null;
};

async function resolvePwaInput(
  user: User,
  body: { projectId?: string; inline?: InlineExportBody }
): Promise<{ input: PwaProjectInput } | { error: string; status: number }> {
  const { supabase } = await getAuthenticatedProfile();

  if (body.projectId) {
    const { data: project, error } = await supabase
      .from('projects')
      .select('id, title, prompt, generated_code, blueprint_json')
      .eq('id', body.projectId)
      .eq('user_id', user.id)
      .single();

    if (error || !project) {
      return { error: 'Project not found', status: 404 };
    }

    if (!project.generated_code?.trim() && !project.blueprint_json) {
      return { error: 'Project has no generated code to export', status: 400 };
    }

    return {
      input: {
        id: project.id,
        title: project.title,
        prompt: project.prompt || '',
        generated_code: project.generated_code || '',
        blueprint_json: (project.blueprint_json as ComponentBlueprint | null) ?? null,
      },
    };
  }

  const inline = body.inline;
  if (!inline?.generated_code?.trim() && !inline?.blueprint_json) {
    return { error: 'projectId or inline generated_code is required', status: 400 };
  }

  const title = inline.title?.trim() || inline.prompt?.trim().slice(0, 50) || 'NiskBuild App';
  return {
    input: {
      id: user.id,
      title,
      prompt: inline.prompt || '',
      generated_code: inline.generated_code || '',
      blueprint_json: inline.blueprint_json ?? null,
    },
  };
}

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

    const body = await request.json();
    const resolved = await resolvePwaInput(user, body);
    if ('error' in resolved) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }

    const zipBuffer = await buildNativeZip(resolved.input);
    const filename = `${slugifyFilename(resolved.input.title)}-native.zip`;

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
