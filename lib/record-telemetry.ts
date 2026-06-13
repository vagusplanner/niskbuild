import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeDemographicTier, type DemographicTier } from '@/lib/demographic-tiers';
import { buildTelemetryRecord, type CompilationEvent } from '@/lib/telemetry';

interface ProfileTelemetryPrefs {
  demographic_tier?: string | null;
  telemetry_opt_out?: boolean | null;
  analytics_region?: string | null;
}

export async function getTelemetryPrefs(userId?: string | null): Promise<{
  demographicTier: DemographicTier;
  optOut: boolean;
  analyticsRegion: string | null;
}> {
  if (!userId) {
    return { demographicTier: 'unspecified', optOut: false, analyticsRegion: null };
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('profiles')
    .select('demographic_tier, telemetry_opt_out, analytics_region')
    .eq('id', userId)
    .single();

  const profile = data as ProfileTelemetryPrefs | null;

  return {
    demographicTier: normalizeDemographicTier(profile?.demographic_tier),
    optOut: profile?.telemetry_opt_out === true,
    analyticsRegion: profile?.analytics_region || null,
  };
}

/**
 * Records anonymous macro-level telemetry. Prompt/code are classified in-memory
 * and never written to the analytics table.
 */
export async function recordAnonymousTelemetry(
  event: CompilationEvent,
  userId?: string | null
): Promise<{ logged: boolean; telemetry_id?: string }> {
  try {
    const prefs = await getTelemetryPrefs(userId);
    if (prefs.optOut) {
      return { logged: false };
    }

    const record = buildTelemetryRecord({
      ...event,
      demographicTier: event.demographicTier || prefs.demographicTier,
    });

    const supabase = createAdminClient();
    const { error } = await supabase.from('public_analytics_telemetry').insert([record]);

    if (error) {
      console.error('Telemetry insert error:', error.message);
      return { logged: false };
    }

    return { logged: true, telemetry_id: record.telemetry_id };
  } catch (err) {
    console.error('Telemetry record failed:', err);
    return { logged: false };
  }
}
