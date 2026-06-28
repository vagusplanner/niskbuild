import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';
import { fetchAnalyticsDashboard } from '@/lib/analytics-dashboard';

export async function GET(request: NextRequest) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const range = request.nextUrl.searchParams.get('range');
    const data = await fetchAnalyticsDashboard(range);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load analytics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
