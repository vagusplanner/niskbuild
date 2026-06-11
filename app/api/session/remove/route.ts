import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { removeSession } from '@/lib/session-tracker';

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const { sessionToken } = await request.json();
    if (!sessionToken || typeof sessionToken !== 'string') {
      return NextResponse.json({ error: 'sessionToken required' }, { status: 400 });
    }

    await removeSession(sessionToken);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Session remove error:', error);
    return NextResponse.json({ error: 'Failed to remove session' }, { status: 500 });
  }
}
