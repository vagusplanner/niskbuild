import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyNpsLink } from '@/lib/nps-link';
import { appUrl } from '@/lib/email/app-url';

function redirectTo(path: string): NextResponse {
  return NextResponse.redirect(appUrl(path), 302);
}

async function storeScore(userId: string, score: number, comment?: string | null) {
  const admin = createAdminClient();
  const { error } = await admin.from('nps_scores').insert({
    user_id: userId,
    score,
    comment: comment ?? null,
  });
  return !error;
}

function scoreRedirectPath(score: number, userId: string, token: string): string {
  const q = `user=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}&score=${score}`;
  if (score >= 9) return `/nps/promoter?${q}`;
  if (score >= 7) return `/nps/passive?${q}`;
  return `/nps/thanks?${q}`;
}

/** Email one-click: /api/nps?score=1-10&user=uuid&token=signed */
export async function GET(request: NextRequest) {
  const scoreRaw = request.nextUrl.searchParams.get('score');
  const userId = request.nextUrl.searchParams.get('user')?.trim();
  const token = request.nextUrl.searchParams.get('token');

  const score = Number(scoreRaw);
  if (!userId || !Number.isInteger(score) || score < 1 || score > 10) {
    return redirectTo('/nps');
  }
  if (!verifyNpsLink(userId, token)) {
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 403 });
  }

  await storeScore(userId, score);
  return redirectTo(scoreRedirectPath(score, userId, token!));
}

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const score = Number(body.score);
    const comment = typeof body.comment === 'string' ? body.comment.trim() : undefined;
    const userId = typeof body.user === 'string' ? body.user.trim() : guard.user!.id;
    const token = typeof body.token === 'string' ? body.token : undefined;

    if (!Number.isInteger(score) || score < 0 || score > 10) {
      return NextResponse.json({ error: 'score must be an integer 0–10' }, { status: 400 });
    }

    const isSelf = guard.user!.id === userId;
    const tokenOk = token ? verifyNpsLink(userId, token) : false;
    if (!isSelf && !tokenOk) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const admin = createAdminClient();

    if (comment && tokenOk) {
      const { data: existing } = await admin
        .from('nps_scores')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        await admin.from('nps_scores').update({ comment }).eq('id', existing.id);
        return NextResponse.json({ success: true, updated: true });
      }
    }

    const { error } = await admin.from('nps_scores').insert({
      user_id: userId,
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
