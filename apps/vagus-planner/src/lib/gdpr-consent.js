/**
 * Client-side GDPR consent helpers for Vagus Planner.
 * Persists under UserSettings.preferences.gdpr_consents (+ localStorage mirror).
 */

import { base44 } from '@/api/base44Client';

export const VP_CONSENT_PREFS_KEY = 'gdpr_consents';
export const VP_CONSENT_LOCAL_PREFIX = 'legal_consent_accepted_';
export const VP_CONSENT_VERSION = 1;

export const DEFAULT_CONSENTS = {
  terms_accepted: false,
  privacy_accepted: false,
  cookies_essential_accepted: false,
  age_confirmed: false,
  date_of_birth: null,
  art9_religious_accepted: false,
  art9_health_accepted: false,
  accepted_at: null,
  updated_at: null,
  version: VP_CONSENT_VERSION,
};

export function localConsentKey(email) {
  return `${VP_CONSENT_LOCAL_PREFIX}${email || 'anonymous'}`;
}

export function parseConsentsFromSettings(settingsRecord) {
  if (!settingsRecord || typeof settingsRecord !== 'object') {
    return { ...DEFAULT_CONSENTS };
  }
  const prefs =
    settingsRecord.preferences &&
    typeof settingsRecord.preferences === 'object' &&
    !Array.isArray(settingsRecord.preferences)
      ? settingsRecord.preferences
      : null;
  // Prefer preferences.gdpr_consents (DB shape). Fall back to top-level
  // gdpr_consents — mapUserSettingsFromRow spreads prefs onto the entity.
  const raw =
    (prefs && typeof prefs[VP_CONSENT_PREFS_KEY] === 'object'
      ? prefs[VP_CONSENT_PREFS_KEY]
      : null) ||
    (typeof settingsRecord[VP_CONSENT_PREFS_KEY] === 'object'
      ? settingsRecord[VP_CONSENT_PREFS_KEY]
      : null);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_CONSENTS };
  }
  return {
    ...DEFAULT_CONSENTS,
    ...raw,
    // Normalize Art.9 flags to strict booleans so UI/server agree.
    art9_religious_accepted: raw.art9_religious_accepted === true,
    art9_health_accepted: raw.art9_health_accepted === true,
    version: typeof raw.version === 'number' ? raw.version : VP_CONSENT_VERSION,
  };
}

export function hasCompletedLegalConsent(consents) {
  return Boolean(
    consents?.terms_accepted &&
      consents?.privacy_accepted &&
      consents?.cookies_essential_accepted &&
      consents?.age_confirmed
  );
}

export function canSendArt9ToAi(consents, category) {
  if (category === 'religious') return consents?.art9_religious_accepted === true;
  if (category === 'health') return consents?.art9_health_accepted === true;
  return false;
}

/**
 * Persist consents to UserSettings + localStorage mirror for fast Layout gating.
 */
export async function saveGdprConsents(partial, { email } = {}) {
  // list()/filter are scoped to the signed-in user (critical for platform owners
  // whose RLS can otherwise surface every vp_user_settings row).
  let existing = null;
  try {
    const me = await base44.auth.me();
    if (me?.id) {
      const scoped = await base44.entities.UserSettings.filter({ user_id: me.id });
      existing = scoped?.[0] ?? null;
    }
  } catch {
    // fall through
  }
  if (!existing) {
    const list = await base44.entities.UserSettings.list();
    existing = list?.[0] ?? null;
  }
  const current = parseConsentsFromSettings(existing);
  const next = {
    ...current,
    ...partial,
    updated_at: new Date().toISOString(),
    version: VP_CONSENT_VERSION,
  };
  if (hasCompletedLegalConsent(next) && !next.accepted_at) {
    next.accepted_at = new Date().toISOString();
  }

  const payload = {
    [VP_CONSENT_PREFS_KEY]: next,
  };

  if (existing?.id) {
    await base44.entities.UserSettings.update(existing.id, payload);
  } else {
    await base44.entities.UserSettings.create(payload);
  }

  if (email) {
    try {
      localStorage.setItem(
        localConsentKey(email),
        hasCompletedLegalConsent(next) ? '1' : '0'
      );
      localStorage.setItem(`${localConsentKey(email)}_payload`, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  return next;
}

export function readLocalConsentMirror(email) {
  try {
    const raw = localStorage.getItem(`${localConsentKey(email)}_payload`);
    if (raw) return { ...DEFAULT_CONSENTS, ...JSON.parse(raw) };
    if (localStorage.getItem(localConsentKey(email)) === '1') {
      // Legacy boolean-only mirror from older Layout check
      return {
        ...DEFAULT_CONSENTS,
        terms_accepted: true,
        privacy_accepted: true,
        cookies_essential_accepted: true,
        age_confirmed: true,
      };
    }
  } catch {
    // ignore
  }
  return null;
}
