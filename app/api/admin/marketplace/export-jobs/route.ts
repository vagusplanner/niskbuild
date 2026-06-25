import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';

export async function GET(request: NextRequest) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const status = request.nextUrl.searchParams.get('status');
    const admin = createAdminClient();

    let query = admin
      .schema('marketplace')
      .from('export_jobs')
      .select('id, requester_user_id, app_reference, status, fee_cents, notes, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: jobs, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const requesterIds = [...new Set((jobs ?? []).map((j) => j.requester_user_id as string))];
    const emailById = new Map<string, string>();

    if (requesterIds.length) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, email')
        .in('id', requesterIds);
      for (const p of profiles ?? []) {
        emailById.set(p.id, p.email);
      }
    }

    return NextResponse.json({
      jobs: (jobs ?? []).map((j) => ({
        ...j,
        requester_email: emailById.get(j.requester_user_id as string) ?? 'Unknown',
      })),
    });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to load export jobs');
  }
}

export async function PATCH(request: NextRequest) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const { id, status, notes } = await request.json();
    if (!id || !status) {
      return NextResponse.json({ error: 'Job id and status required' }, { status: 400 });
    }

    const allowed = new Set(['requested', 'approved', 'in_progress', 'completed', 'rejected']);
    if (!allowed.has(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .schema('marketplace')
      .from('export_jobs')
      .update({
        status,
        ...(typeof notes === 'string' ? { notes: notes.slice(0, 500) } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, status')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ job: data });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to update export job');
  }
}
