import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
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
    return apiErrorResponse(error, 'Failed to remove session');
  }
}
