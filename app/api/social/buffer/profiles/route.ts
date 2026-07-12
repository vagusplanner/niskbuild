import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import {
  CUSTOMER_BUFFER_COMING_SOON_CODE,
  CUSTOMER_BUFFER_COMING_SOON_MESSAGE,
} from '@/lib/buffer/customer-coming-soon';

/** List Buffer profiles — customer OAuth deferred. */
export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;
  if (!guard.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(
    {
      error: CUSTOMER_BUFFER_COMING_SOON_MESSAGE,
      code: CUSTOMER_BUFFER_COMING_SOON_CODE,
      comingSoon: true,
      connected: false,
      profiles: [],
    },
    { status: 503 }
  );
}
