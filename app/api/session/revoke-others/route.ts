import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { hashSessionToken, revokeOtherSessions } from '@/lib/session-tracker';

export async function DELETE(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const sessionToken = request.nextUrl.searchParams.get('sessionToken') || '';
  if (!sessionToken) {
    return NextResponse.json({ error: 'sessionToken required' }, { status: 400 });
  }

  const result = await revokeOtherSessions(
    guard.user!.id,
    hashSessionToken(sessionToken)
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true, revoked: result.revoked });
}
