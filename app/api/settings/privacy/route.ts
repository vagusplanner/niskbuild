import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';
import { normalizeDemographicTier, type DemographicTier } from '@/lib/demographic-tiers';

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const user = guard.user!;

  const { data: profile } = await supabase
    .from('profiles')
    .select('demographic_tier, telemetry_opt_out')
    .eq('id', user.id)
    .single();

  return NextResponse.json({
    demographicTier: normalizeDemographicTier(profile?.demographic_tier),
    telemetryOptOut: profile?.telemetry_opt_out ?? false,
  });
}

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const supabase = await createClient();
  const user = guard.user!;

  const { demographicTier, telemetryOptOut } = await request.json();
  const update: Record<string, string | boolean> = {};

  if (demographicTier !== undefined) {
    update.demographic_tier = normalizeDemographicTier(demographicTier) as DemographicTier;
  }
  if (telemetryOptOut !== undefined) {
    update.telemetry_opt_out = !!telemetryOptOut;
  }

  const { error } = await supabase.from('profiles').update(update).eq('id', user.id);

  if (error) {
    return NextResponse.json({ error: 'Failed to save privacy settings' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
