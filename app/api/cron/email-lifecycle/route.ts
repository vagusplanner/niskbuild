import { NextRequest, NextResponse } from 'next/server';
import { processEmailLifecycleCron } from '@/lib/email/cron';

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET || process.env.VP_CRON_SECRET;
  if (!secret) return false;

  const auth = request.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;

  return request.headers.get('x-cron-secret') === secret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stats = await processEmailLifecycleCron();
    return NextResponse.json({ ok: true, stats });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cron failed';
    console.error('email-lifecycle cron:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
