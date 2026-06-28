import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const score = Number(body.score);
    const comment = typeof body.comment === 'string' ? body.comment.trim() : undefined;

    if (!Number.isInteger(score) || score < 0 || score > 10) {
      return NextResponse.json({ error: 'score must be an integer 0–10' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin.from('nps_scores').insert({
      user_id: guard.user!.id,
      score,
      comment: comment || null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
