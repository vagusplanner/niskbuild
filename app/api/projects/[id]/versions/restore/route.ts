import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import { getNextVersionNumber, insertProjectVersion } from '@/lib/project-versions';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const { supabase, user, profile } = await getAuthenticatedProfile();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: projectId } = await context.params;
  const { version_id: versionId } = await request.json();

  if (!versionId) {
    return NextResponse.json({ error: 'version_id is required' }, { status: 400 });
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, title, prompt, generated_code, files_json, blueprint_json')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (projectError) {
    return NextResponse.json({ error: projectError.message }, { status: 500 });
  }
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const { data: targetVersion, error: versionError } = await supabase
    .from('project_versions')
    .select('*')
    .eq('id', versionId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (versionError) {
    return NextResponse.json({ error: versionError.message }, { status: 500 });
  }
  if (!targetVersion) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 });
  }

  const tier = profile?.subscription_tier ?? 'free';

  const nextVersion = await getNextVersionNumber(supabase, projectId);
  await insertProjectVersion(supabase, {
    projectId,
    tier,
    blueprint_json: project.blueprint_json,
    generated_code: project.generated_code,
    files_json: project.files_json ?? undefined,
    prompt_used: project.prompt || '',
    credits_used: 0,
  });

  const updateRow: Record<string, unknown> = {
    generated_code: targetVersion.generated_code,
    prompt: targetVersion.prompt_used || project.prompt,
    blueprint_json: targetVersion.blueprint_json,
  };
  // Always write files_json on restore so a multi-page → single-page restore clears stale pages.
  updateRow.files_json = targetVersion.files_json ?? null;

  const { error: updateError } = await supabase
    .from('projects')
    .update(updateRow)
    .eq('id', projectId)
    .eq('user_id', user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    restored_version: targetVersion.version_number,
    saved_snapshot_version: nextVersion,
    generated_code: targetVersion.generated_code,
    files_json: targetVersion.files_json ?? null,
    prompt: targetVersion.prompt_used,
    blueprint_json: targetVersion.blueprint_json,
    latest_version: nextVersion,
  });
}
