import { NextRequest, NextResponse } from 'next/server';
import { guardInsightsApiKey } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * B2B Live Trend Dashboard API (Product 1)
 * Protected by INSIGHTS_API_KEY — aggregated macro data only, no PII.
 */
export async function GET(request: NextRequest) {
  const guard = await guardInsightsApiKey(request);
  if (!guard.ok) return guard.response;

  const days = Math.min(parseInt(request.nextUrl.searchParams.get('days') || '14', 10), 90);
  const since = new Date();
  since.setDate(since.getDate() - days);

  const supabase = createAdminClient();
  const { data: rows, error } = await supabase
    .from('public_analytics_telemetry')
    .select('app_vertical, core_stack, user_demographic_tier, ai_model_used, generation_success, timestamp_hourly')
    .gte('timestamp_hourly', since.toISOString());

  if (error) {
    return NextResponse.json({ error: 'Failed to load trends' }, { status: 500 });
  }

  const records = rows || [];
  const verticalCounts: Record<string, number> = {};
  const stackCounts: Record<string, number> = {};
  const demographicVertical: Record<string, Record<string, number>> = {};
  const hourlyBuckets: Record<string, number> = {};
  let successes = 0;

  for (const row of records) {
    const vertical = row.app_vertical || 'Unknown';
    verticalCounts[vertical] = (verticalCounts[vertical] || 0) + 1;

    const demo = row.user_demographic_tier || 'unspecified';
    if (!demographicVertical[demo]) demographicVertical[demo] = {};
    demographicVertical[demo][vertical] = (demographicVertical[demo][vertical] || 0) + 1;

    const stacks = Array.isArray(row.core_stack) ? row.core_stack : [];
    for (const tag of stacks) {
      stackCounts[tag] = (stackCounts[tag] || 0) + 1;
    }

    const hour = row.timestamp_hourly?.slice(0, 13) || 'unknown';
    hourlyBuckets[hour] = (hourlyBuckets[hour] || 0) + 1;

    if (row.generation_success) successes++;
  }

  const sortEntries = (obj: Record<string, number>) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

  const total = records.length;
  const prevPeriodStart = new Date(since);
  prevPeriodStart.setDate(prevPeriodStart.getDate() - days);

  return NextResponse.json({
    product: 'NiskBuild Real-Time Software Composition Index',
    period_days: days,
    total_events: total,
    success_rate: total > 0 ? Number(((successes / total) * 100).toFixed(1)) : 0,
    top_app_verticals: sortEntries(verticalCounts).slice(0, 15),
    top_frameworks: sortEntries(stackCounts).slice(0, 15),
    demographic_breakdown: demographicVertical,
    hourly_volume: sortEntries(hourlyBuckets).slice(-48),
    spike_alerts: detectSpikes(verticalCounts, total),
    disclaimer:
      'Aggregated anonymous macro telemetry only. No user IDs, emails, IPs, or raw prompts.',
  });
}

function detectSpikes(
  verticalCounts: Record<string, number>,
  total: number
): { vertical: string; share_pct: number; signal: string }[] {
  if (total < 10) return [];

  return Object.entries(verticalCounts)
    .map(([vertical, count]) => ({
      vertical,
      share_pct: Number(((count / total) * 100).toFixed(1)),
      signal: count / total >= 0.15 ? 'high_concentration' : 'normal',
    }))
    .filter((s) => s.signal === 'high_concentration')
    .sort((a, b) => b.share_pct - a.share_pct)
    .slice(0, 5);
}
