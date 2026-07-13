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
  const prefs = settingsRecord?.preferences;
  const raw =
    prefs && typeof prefs === 'object' && !Array.isArray(prefs)
      ? prefs[VP_CONSENT_PREFS_KEY]
      : null;
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_CONSENTS };
  return {
    ...DEFAULT_CONSENTS,
    ...raw,
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
  const list = await base44.entities.UserSettings.list();
  const existing = list?.[0] ?? null;
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
