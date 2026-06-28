import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';
import { normalizeDemographicTier, type DemographicTier } from '@/lib/demographic-tiers';
import { normalizeAnalyticsRegion } from '@/lib/user-region';

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const user = guard.user!;

  const { data: profile } = await supabase
    .from('profiles')
    .select('demographic_tier, analytics_opt_in, telemetry_opt_out, analytics_region')
    .eq('id', user.id)
    .single();

  const analyticsOptIn = profile?.analytics_opt_in !== false;

  return NextResponse.json({
    demographicTier: normalizeDemographicTier(profile?.demographic_tier),
    analyticsOptIn,
    telemetryOptOut: profile?.telemetry_opt_out ?? !analyticsOptIn,
    analyticsRegion: normalizeAnalyticsRegion(profile?.analytics_region),
  });
}

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const user = guard.user!;

  const { demographicTier, analyticsOptIn, telemetryOptOut, analyticsRegion } = await request.json();
  const update: Record<string, string | boolean | null> = {};

  if (demographicTier !== undefined) {
    update.demographic_tier = normalizeDemographicTier(demographicTier) as DemographicTier;
  }

  if (analyticsOptIn !== undefined) {
    update.analytics_opt_in = !!analyticsOptIn;
    update.telemetry_opt_out = !analyticsOptIn;
  } else if (telemetryOptOut !== undefined) {
    update.telemetry_opt_out = !!telemetryOptOut;
    update.analytics_opt_in = !telemetryOptOut;
  }

  if (analyticsRegion !== undefined) {
    update.analytics_region = normalizeAnalyticsRegion(analyticsRegion);
  }

  const { error } = await supabase.from('profiles').update(update).eq('id', user.id);

  if (error) {
    return NextResponse.json({ error: 'Failed to save privacy settings' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
