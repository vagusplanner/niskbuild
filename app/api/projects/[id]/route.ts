import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { getAuthenticatedProfile } from '@/lib/server-profile';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const { id: projectId } = await context.params;
    const { user, supabase } = await getAuthenticatedProfile();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const patch: Record<string, string | null> = {};

    if (typeof body.bundle_id === 'string') patch.bundle_id = body.bundle_id.trim() || null;
    if (typeof body.icon_url === 'string') patch.icon_url = body.icon_url.trim() || null;
    if (typeof body.privacy_policy_url === 'string') {
      patch.privacy_policy_url = body.privacy_policy_url.trim() || null;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('projects')
      .update(patch)
      .eq('id', projectId)
      .eq('user_id', user.id)
      .select('id, bundle_id, icon_url, privacy_policy_url, export_status')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ project: data });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to update project');
  }
}
