import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import { createAdminClient } from '@/lib/supabase/admin';
import { isBuilderTurnOutcome } from '@/lib/builder-turns';

type RouteContext = { params: Promise<{ id: string }> };

const TURN_SELECT =
  'id, project_id, prompt, outcome, outcome_detail, model_id, model_label, credits_used, created_at';

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

async function backfillTurnsFromVersions(projectId: string): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from('builder_turns')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId);

  if ((count ?? 0) > 0) return 0;

  const { data: versions, error } = await admin
    .from('project_versions')
    .select('prompt_used, credits_used, created_at, version_number')
    .eq('project_id', projectId)
    .order('version_number', { ascending: true });

  if (error || !versions?.length) return 0;

  const rows = versions.map((v) => ({
    project_id: projectId,
    prompt: (v.prompt_used || '').trim() || 'Earlier generation',
    outcome: 'built' as const,
    outcome_detail: 'Backfilled from version history',
    model_id: '',
    model_label: '',
    credits_used: Number(v.credits_used) || 0,
    created_at: v.created_at,
  }));

  const { error: insertErr } = await admin.from('builder_turns').insert(rows);
  if (insertErr) return 0;
  return rows.length;
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

  // Lazy backfill if migration SQL wasn't applied yet or project had versions only.
  await backfillTurnsFromVersions(projectId);

  const { data, error } = await supabase
    .from('builder_turns')
    .select(TURN_SELECT)
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ turns: data ?? [] });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const { supabase, user } = await getAuthenticatedProfile();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: projectId } = await context.params;
  const ownership = await assertProjectOwner(supabase, user.id, projectId);
  if (!ownership.ok) {
    return NextResponse.json({ error: ownership.message }, { status: ownership.status });
  }

  const body = await request.json();
  const prompt = typeof body.prompt === 'string' ? body.prompt : '';
  const outcome = body.outcome;
  if (!isBuilderTurnOutcome(outcome)) {
    return NextResponse.json(
      { error: 'outcome must be built|edited|interrupted|failed' },
      { status: 400 }
    );
  }
  if (!prompt.trim() && outcome !== 'edited') {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }

  const row = {
    project_id: projectId,
    prompt: prompt.trim() || '(visual edit)',
    outcome,
    outcome_detail:
      typeof body.outcome_detail === 'string' ? body.outcome_detail.slice(0, 500) : '',
    model_id: typeof body.model_id === 'string' ? body.model_id.slice(0, 80) : '',
    model_label: typeof body.model_label === 'string' ? body.model_label.slice(0, 120) : '',
    credits_used: Number(body.credits_used) || 0,
  };

  const { data, error } = await supabase
    .from('builder_turns')
    .insert(row)
    .select(TURN_SELECT)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || 'Failed to save turn' },
      { status: 500 }
    );
  }

  return NextResponse.json({ turn: data });
}
