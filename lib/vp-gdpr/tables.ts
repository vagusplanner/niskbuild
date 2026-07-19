/**
 * Firstparty Vagus Planner tables that may hold personal data.
 * Used for GDPR erasure + export. Missing tables are skipped safely.
 */

/** Tables with CREATE TABLE migrations in supabase/ */
export const VP_GDPR_CORE_TABLES = [
  'vp_tasks',
  'vp_categories',
  'vp_events',
  'vp_user_settings',
  'vp_goals',
  'vp_holidays',
  'vp_reflections',
  'vp_expenses',
  'vp_prayer_logs',
  'vp_chats',
  'vp_hadith_srs_cards',
  'vp_saved_hadiths',
  'vp_live_locations',
  'vp_reminders',
  'vp_device_tokens',
  'vp_notification_preferences',
  'vp_notifications',
  'vp_subscriptions',
  'vp_invoices',
  'vp_usage',
] as const;

/**
 * Mapped in base44 ENTITY_TABLES but may lack in-repo migrations.
 * Still attempted on delete/export so live DBs with these tables are covered.
 */
export const VP_GDPR_OPTIONAL_TABLES = [
  'vp_periods',
  'vp_islamic_events',
  'vp_conflict_resolutions',
  'vp_habits',
  'vp_habit_completions',
  'vp_shared_calendars',
  'vp_group_calendars',
  'vp_teams',
  'vp_team_members',
  'vp_group_messages',
  'vp_group_chats',
  'vp_meetings',
] as const;

export const VP_GDPR_ALL_TABLES = [
  ...VP_GDPR_CORE_TABLES,
  ...VP_GDPR_OPTIONAL_TABLES,
] as const;

export const VP_UPLOADS_BUCKET = 'uploads';

/** Consent keys stored under vp_user_settings.preferences */
export const VP_CONSENT_PREFS_KEY = 'gdpr_consents';

export type VpArt9Category = 'religious' | 'health';

export type VpGdprConsents = {
  terms_accepted: boolean;
  privacy_accepted: boolean;
  cookies_essential_accepted: boolean;
  age_confirmed: boolean;
  /** ISO date string YYYY-MM-DD when user entered a DOB (self-attest only). */
  date_of_birth?: string | null;
  /**
   * [LEGAL REVIEW NEEDED] Explicit Article 9 opt-in for religious practice data
   * (prayer logs, Islamic edition usage, related AI features).
   */
  art9_religious_accepted: boolean;
  /**
   * [LEGAL REVIEW NEEDED] Explicit Article 9 opt-in for health data
   * (period/mood/sleep/wellness tracking and related AI features).
   */
  art9_health_accepted: boolean;
  accepted_at?: string | null;
  updated_at?: string | null;
  version?: number;
};

export const DEFAULT_VP_GDPR_CONSENTS: VpGdprConsents = {
  terms_accepted: false,
  privacy_accepted: false,
  cookies_essential_accepted: false,
  age_confirmed: false,
  date_of_birth: null,
  art9_religious_accepted: false,
  art9_health_accepted: false,
  accepted_at: null,
  updated_at: null,
  version: 1,
};

export function parseVpGdprConsents(preferences: unknown): VpGdprConsents {
  const prefs =
    preferences && typeof preferences === 'object' && !Array.isArray(preferences)
      ? (preferences as Record<string, unknown>)
      : {};
  const raw = prefs[VP_CONSENT_PREFS_KEY];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_VP_GDPR_CONSENTS };
  }
  const c = raw as Record<string, unknown>;
  return {
    terms_accepted: c.terms_accepted === true,
    privacy_accepted: c.privacy_accepted === true,
    cookies_essential_accepted: c.cookies_essential_accepted === true,
    age_confirmed: c.age_confirmed === true,
    date_of_birth: typeof c.date_of_birth === 'string' ? c.date_of_birth : null,
    art9_religious_accepted: c.art9_religious_accepted === true,
    art9_health_accepted: c.art9_health_accepted === true,
    accepted_at: typeof c.accepted_at === 'string' ? c.accepted_at : null,
    updated_at: typeof c.updated_at === 'string' ? c.updated_at : null,
    version: typeof c.version === 'number' ? c.version : 1,
  };
}

export function canSendArt9CategoryToAi(
  consents: VpGdprConsents,
  category: VpArt9Category
): boolean {
  if (category === 'religious') return consents.art9_religious_accepted === true;
  if (category === 'health') return consents.art9_health_accepted === true;
  return false;
}
