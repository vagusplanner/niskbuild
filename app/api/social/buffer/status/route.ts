import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { getBufferTokenForUser } from '@/lib/buffer/client';
import { apiErrorResponse } from '@/lib/api-error';

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;
  if (!guard.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = await getBufferTokenForUser(guard.user.id);
    return NextResponse.json({ connected: Boolean(token) });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to check Buffer status');
  }
}
