import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  FULL_APP_BACKEND_INTEGRATION,
  isValidAnonKey,
  isValidSupabaseUrl,
  maskAnonKey,
  type FullAppBackendConfig,
} from '@/lib/full-app-backend';

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

function publicPayload(config: FullAppBackendConfig | null, includeSecrets: boolean) {
  const byo =
    config?.mode === 'byo' &&
    Boolean(config.supabaseUrl?.trim() && config.supabaseAnonKey?.trim());
  return {
    mode: config?.mode ?? null,
    connected: byo,
    supabaseUrl: byo ? config!.supabaseUrl!.trim() : null,
    supabaseAnonKeyMasked: byo ? maskAnonKey(config!.supabaseAnonKey!) : null,
    ...(includeSecrets && byo
      ? {
          supabaseAnonKey: config!.supabaseAnonKey!.trim(),
        }
      : {}),
    managedAvailable: false as const,
    managedLabel: 'Coming soon' as const,
  };
}

/**
 * GET /api/full-app/backend?projectId=…&forPreview=1
 * Returns BYO connection status. With forPreview=1, includes the anon key
 * for the project owner so the builder preview can inject it (never logged).
 */
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

  const forPreview = request.nextUrl.searchParams.get('forPreview') === '1';
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('project_integrations')
    .select('config_json, status')
    .eq('project_id', projectId)
    .eq('integration_name', FULL_APP_BACKEND_INTEGRATION)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const config = (data?.config_json ?? null) as FullAppBackendConfig | null;
  return NextResponse.json(publicPayload(config, forPreview));
}

/**
 * PUT /api/full-app/backend
 * Body: { projectId, mode: 'byo', supabaseUrl, supabaseAnonKey }
 * or { projectId, mode: 'managed' } → 501 Coming soon
 */
export async function PUT(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  let body: {
    projectId?: string;
    mode?: string;
    supabaseUrl?: string;
    supabaseAnonKey?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const projectId = body.projectId?.trim();
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }

  const project = await assertProjectOwner(guard.user!.id, projectId);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  if (body.mode === 'managed') {
    return NextResponse.json(
      {
        error: 'NiskBuild Managed backend is coming soon',
        managedAvailable: false,
        managedLabel: 'Coming soon',
      },
      { status: 501 }
    );
  }

  if (body.mode !== 'byo') {
    return NextResponse.json({ error: 'mode must be byo or managed' }, { status: 400 });
  }

  const supabaseUrl = String(body.supabaseUrl ?? '').trim();
  const supabaseAnonKey = String(body.supabaseAnonKey ?? '').trim();

  if (!isValidSupabaseUrl(supabaseUrl)) {
    return NextResponse.json(
      { error: 'supabaseUrl must be an https://….supabase.co URL' },
      { status: 400 }
    );
  }
  if (!isValidAnonKey(supabaseAnonKey)) {
    return NextResponse.json(
      { error: 'supabaseAnonKey looks invalid (expected anon/publishable key)' },
      { status: 400 }
    );
  }

  const config: FullAppBackendConfig = {
    mode: 'byo',
    supabaseUrl,
    supabaseAnonKey,
    updatedAt: new Date().toISOString(),
  };

  const supabase = createAdminClient();
  const { error } = await supabase.from('project_integrations').upsert(
    {
      project_id: projectId,
      integration_name: FULL_APP_BACKEND_INTEGRATION,
      status: 'active',
      config_json: config,
      added_at: new Date().toISOString(),
    },
    { onConflict: 'project_id,integration_name' }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(publicPayload(config, false));
}

export async function DELETE(request: NextRequest) {
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
  const { error } = await supabase
    .from('project_integrations')
    .delete()
    .eq('project_id', projectId)
    .eq('integration_name', FULL_APP_BACKEND_INTEGRATION);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, connected: false });
}
