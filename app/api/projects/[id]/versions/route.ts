import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import { insertProjectVersion } from '@/lib/project-versions';

type RouteContext = { params: Promise<{ id: string }> };

async function assertProjectOwner(
  supabase: Awaited<ReturnType<typeof getAuthenticatedProfile>>['supabase'],
  userId: string,
  projectId: string
) {
  const { data, error } = await supabase
    .from('projects')
    .select('id, user_id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return { ok: false as const, status: 500, message: error.message };
  if (!data) return { ok: false as const, status: 404, message: 'Project not found' };
  return { ok: true as const, project: data };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const { supabase, user } = await getAuthenticatedProfile();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: projectId } = await context.params;
  const ownership = await assertProjectOwner(supabase, user.id, projectId);
  if (!ownership.ok) {
    return NextResponse.json({ error: ownership.message }, { status: ownership.status });
  }

  const { data, error } = await supabase
    .from('project_versions')
    .select('id, project_id, version_number, prompt_used, credits_used, created_at')
    .eq('project_id', projectId)
    .order('version_number', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const latest = data?.[0]?.version_number ?? 0;
  return NextResponse.json({ versions: data ?? [], latest_version: latest });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const { supabase, user, profile } = await getAuthenticatedProfile();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: projectId } = await context.params;
  const ownership = await assertProjectOwner(supabase, user.id, projectId);
  if (!ownership.ok) {
    return NextResponse.json({ error: ownership.message }, { status: ownership.status });
  }

  const body = await request.json();
  const { blueprint_json, generated_code, files_json, prompt_used, credits_used } = body;

  if (!generated_code?.trim()) {
    return NextResponse.json({ error: 'generated_code is required' }, { status: 400 });
  }

  const tier = profile?.subscription_tier ?? 'free';
  const filesPayload =
    files_json != null && typeof files_json === 'object' ? files_json : undefined;

  const version = await insertProjectVersion(supabase, {
    projectId,
    tier,
    blueprint_json,
    generated_code,
    files_json: filesPayload,
    prompt_used: prompt_used || '',
    credits_used: Number(credits_used) || 0,
  });

  if (!version) {
    return NextResponse.json({ error: 'Failed to save version' }, { status: 500 });
  }

  // Keep the project row in sync so reload/list reflects the latest multi-page state.
  const projectUpdate: Record<string, unknown> = {
    generated_code,
  };
  if (filesPayload != null) {
    projectUpdate.files_json = filesPayload;
  }
  if (blueprint_json !== undefined) {
    projectUpdate.blueprint_json = blueprint_json;
  }
  if (typeof prompt_used === 'string' && prompt_used.trim()) {
    projectUpdate.prompt = prompt_used;
  }
  await supabase.from('projects').update(projectUpdate).eq('id', projectId).eq('user_id', user.id);

  return NextResponse.json({
    version: {
      id: version.id,
      version_number: version.version_number,
      created_at: version.created_at,
    },
  });
}
