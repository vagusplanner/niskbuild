import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedProfile } from '@/lib/server-profile';

function maskConfig(config: Record<string, unknown> | null) {
  if (!config) return {};
  const { stripe_secret_key: _secret, ...safe } = config as Record<string, unknown>;
  if (typeof safe.publishableKey === 'string' && safe.publishableKey.length > 8) {
    safe.publishableKey = `${safe.publishableKey.slice(0, 7)}…`;
  }
  return safe;
}

async function assertProjectOwner(userId: string, projectId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const projectId = request.nextUrl.searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }

  const project = await assertProjectOwner(guard.user!.id, projectId);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('project_integrations')
    .select('integration_name, status, config_json, added_at')
    .eq('project_id', projectId)
    .eq('status', 'active');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const integrations = (data ?? []).map((row) => ({
    integration_name: row.integration_name,
    status: row.status,
    config_json: maskConfig(row.config_json as Record<string, unknown>),
    added_at: row.added_at,
  }));

  return NextResponse.json({ integrations });
}

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const { integrationName } = await request.json();
  if (!integrationName || typeof integrationName !== 'string') {
    return NextResponse.json({ error: 'integrationName required' }, { status: 400 });
  }

  const { supabase, user } = await getAuthenticatedProfile();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase.from('integration_waitlist').upsert(
    {
      user_id: user.id,
      integration_name: integrationName,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,integration_name' }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
