import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { loadBufferTokenRow } from '@/lib/buffer/client';
import { apiErrorResponse } from '@/lib/api-error';

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;
  if (!guard.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const row = await loadBufferTokenRow(guard.user.id);
    if (!row) {
      return NextResponse.json({ connected: false, needsReconnect: false });
    }

    const expired = row.expires_at && new Date(row.expires_at).getTime() < Date.now();
    const needsReconnect = expired && !row.refresh_token;

    return NextResponse.json({
      connected: !needsReconnect,
      needsReconnect,
      reconnectUrl: '/api/social/buffer/auth',
    });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to check Buffer status');
  }
}
