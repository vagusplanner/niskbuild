import { NextResponse } from 'next/server';
import { getPlatformStatusSnapshot } from '@/lib/platform-status';
import { apiErrorResponse } from '@/lib/api-error';

/** Public: current manual status + recent incident updates. */
export async function GET() {
  try {
    const snapshot = await getPlatformStatusSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    return apiErrorResponse(error, 'Failed to load status');
  }
}
