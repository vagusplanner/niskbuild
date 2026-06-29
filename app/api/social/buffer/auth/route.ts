import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { buildBufferAuthorizeUrl } from '@/lib/buffer/client';
import { storeOAuthState } from '@/lib/buffer/oauth-state';
import { apiErrorResponse } from '@/lib/api-error';

/** Start Buffer OAuth — stores random state server-side, never passes user ID as state */
export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;
  if (!guard.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const state = await storeOAuthState(guard.user.id, 'buffer');
    const authorizeUrl = buildBufferAuthorizeUrl(state);
    return NextResponse.redirect(authorizeUrl);
  } catch (error) {
    return apiErrorResponse(error, 'Failed to start Buffer authorization');
  }
}
