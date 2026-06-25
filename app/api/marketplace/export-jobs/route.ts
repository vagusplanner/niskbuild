import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const appReference =
      body.app_reference && typeof body.app_reference === 'object' ? body.app_reference : {};
    const notes = typeof body.notes === 'string' ? body.notes.slice(0, 500) : null;
    const feeCents = parseInt(String(body.fee_cents ?? 0), 10);

    const supabase = await createClient();
    const { data, error } = await supabase
      .schema('marketplace')
      .from('export_jobs')
      .insert({
        requester_user_id: guard.user!.id,
        app_reference: appReference,
        notes,
        fee_cents: Number.isFinite(feeCents) ? feeCents : 0,
        status: 'requested',
      })
      .select('id, status, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ job: data }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to request export');
  }
}

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .schema('marketplace')
      .from('export_jobs')
      .select('id, status, fee_cents, notes, app_reference, created_at, updated_at')
      .eq('requester_user_id', guard.user!.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ jobs: data ?? [] });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to load export jobs');
  }
}
