import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';
import { fetchDemandAnalyticsDashboard } from '@/lib/prompt-category-stats';

export async function GET(request: NextRequest) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const granularity = request.nextUrl.searchParams.get('granularity');
    const data = await fetchDemandAnalyticsDashboard(granularity);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load demand analytics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
