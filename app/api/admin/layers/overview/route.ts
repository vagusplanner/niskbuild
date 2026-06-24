import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';
import { fetchLayerOverviewStats } from '@/lib/layer-overview-stats';

export type LayerOverviewResponse = Awaited<ReturnType<typeof fetchLayerOverviewStats>>;

export async function GET(request: NextRequest) {
  const admin = await requirePlatformOwner(request);
  if (!admin.ok) return admin.response;

  try {
    const payload = await fetchLayerOverviewStats();
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load layer overview';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
