import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  const period = request.nextUrl.searchParams.get('period') || '30d';
  const since = new Date();
  if (period === '7d') since.setDate(since.getDate() - 7);
  else if (period === '365d') since.setDate(since.getDate() - 365);
  else since.setDate(since.getDate() - 30);

  const supabase = createAdminClient();
  const { data: rows, error } = await supabase
    .from('public_analytics_telemetry')
    .select('app_vertical, core_stack, user_demographic_tier, generation_success, timestamp_hourly')
    .gte('timestamp_hourly', since.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const records = rows || [];
  const verticalCounts: Record<string, number> = {};
  const stackCounts: Record<string, number> = {};
  const demoCounts: Record<string, number> = {};
  let successes = 0;

  for (const row of records) {
    const v = row.app_vertical || 'Unknown';
    verticalCounts[v] = (verticalCounts[v] || 0) + 1;
    demoCounts[row.user_demographic_tier || 'unspecified'] =
      (demoCounts[row.user_demographic_tier || 'unspecified'] || 0) + 1;
    const stacks = Array.isArray(row.core_stack) ? row.core_stack : [];
    for (const tag of stacks) {
      stackCounts[tag] = (stackCounts[tag] || 0) + 1;
    }
    if (row.generation_success) successes++;
  }

  const sort = (obj: Record<string, number>) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

  return NextResponse.json({
    total_events: records.length,
    success_rate: records.length ? `${((successes / records.length) * 100).toFixed(1)}%` : '0%',
    top_verticals: sort(verticalCounts).slice(0, 12),
    top_frameworks: sort(stackCounts).slice(0, 8),
    demographic_mix: sort(demoCounts),
    period,
    data_source: 'public_analytics_telemetry',
  });
}
