/**
 * Single source of truth for NiskBuild analytics / telemetry preference.
 *
 * Canonical column: `profiles.analytics_opt_in`
 * Derived mirrors (kept in sync for legacy readers):
 *   - telemetry_opt_out = !analytics_opt_in
 *   - metadata_opt_in   = analytics_opt_in
 *
 * Opt-out is forward-looking only: past usage_events / prompt_category_stats /
 * public_analytics_telemetry rows are not erased when the user opts out.
 * [LEGAL REVIEW NEEDED] Whether to offer erasure of aggregate history on request.
 */

export type AnalyticsPreferenceColumns = {
  analytics_opt_in: boolean;
  telemetry_opt_out: boolean;
  metadata_opt_in: boolean;
};

export function analyticsPreferenceUpdate(optIn: boolean): AnalyticsPreferenceColumns {
  return {
    analytics_opt_in: optIn,
    telemetry_opt_out: !optIn,
    metadata_opt_in: optIn,
  };
}

/** Resolve effective opt-in from possibly-desynced legacy columns (opt-out wins). */
export function resolveAnalyticsOptIn(profile: {
  analytics_opt_in?: boolean | null;
  telemetry_opt_out?: boolean | null;
  metadata_opt_in?: boolean | null;
} | null): boolean {
  if (!profile) return true;
  if (profile.telemetry_opt_out === true) return false;
  if (profile.analytics_opt_in === false) return false;
  if (profile.metadata_opt_in === false) return false;
  return true;
}
