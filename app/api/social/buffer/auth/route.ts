import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import {
  CUSTOMER_BUFFER_COMING_SOON_CODE,
  CUSTOMER_BUFFER_COMING_SOON_MESSAGE,
} from '@/lib/buffer/customer-coming-soon';

/**
 * Customer Buffer OAuth start — deferred.
 * Legacy app registrations are closed; do not redirect users into a broken OAuth flow.
 */
export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;
  if (!guard.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accept = request.headers.get('accept') || '';
  if (accept.includes('text/html')) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const dest = new URL('/builder', appUrl);
    dest.searchParams.set('social', 'coming-soon');
    return NextResponse.redirect(dest.toString());
  }

  return NextResponse.json(
    {
      error: CUSTOMER_BUFFER_COMING_SOON_MESSAGE,
      code: CUSTOMER_BUFFER_COMING_SOON_CODE,
      comingSoon: true,
    },
    { status: 503 }
  );
}
