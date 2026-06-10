import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { revokeSession } from '@/lib/session-tracker';

export async function DELETE(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const sessionId = request.nextUrl.searchParams.get('id');
  if (!sessionId) {
    return NextResponse.json({ error: 'Session id required' }, { status: 400 });
  }

  const result = await revokeSession(guard.user!.id, sessionId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
