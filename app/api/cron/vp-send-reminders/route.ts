import { NextRequest, NextResponse } from 'next/server';
import { processDueReminders } from '@/lib/vp-notifications/process-due-reminders';

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET || process.env.VP_CRON_SECRET;
  if (!secret) return false;

  const auth = request.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;

  const header = request.headers.get('x-cron-secret');
  return header === secret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processDueReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cron failed';
    console.error('vp-send-reminders cron:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
