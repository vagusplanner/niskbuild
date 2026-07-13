import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';
import { normalizeDemographicTier, type DemographicTier } from '@/lib/demographic-tiers';
import { normalizeAnalyticsRegion } from '@/lib/user-region';
import {
  analyticsPreferenceUpdate,
  resolveAnalyticsOptIn,
} from '@/lib/analytics-prefs';

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const user = guard.user!;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(
      'demographic_tier, analytics_opt_in, telemetry_opt_out, metadata_opt_in, analytics_region, age_minimum_attested_at'
    )
    .eq('id', user.id)
    .single();

  // Column may be missing until age-minimum-attested-migration.sql is applied.
  let ageMinimumAttested = true;
  let resolved = profile;
  if (
    profileError?.message?.includes('age_minimum_attested') ||
    profileError?.code === '42703'
  ) {
    const { data: fallback } = await supabase
      .from('profiles')
      .select(
        'demographic_tier, analytics_opt_in, telemetry_opt_out, metadata_opt_in, analytics_region'
      )
      .eq('id', user.id)
      .single();
    resolved = fallback as typeof profile;
    ageMinimumAttested = true;
  } else {
    ageMinimumAttested = Boolean(profile?.age_minimum_attested_at);
  }

  const analyticsOptIn = resolveAnalyticsOptIn(resolved);

  return NextResponse.json({
    demographicTier: normalizeDemographicTier(resolved?.demographic_tier),
    analyticsOptIn,
    telemetryOptOut: !analyticsOptIn,
    analyticsRegion: normalizeAnalyticsRegion(resolved?.analytics_region),
    ageMinimumAttested,
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
    Object.assign(update, analyticsPreferenceUpdate(!!analyticsOptIn));
  } else if (telemetryOptOut !== undefined) {
    Object.assign(update, analyticsPreferenceUpdate(!telemetryOptOut));
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
