/**
 * WelcomeQuestionnaire "seen" flags — localStorage + vp_user_settings.preferences.onboarding_completed.
 * localStorage is written first (sync) so Calendar navigation-away cannot re-prompt even if the
 * async DB write is still in flight or fails.
 */

import { base44 } from '@/api/base44Client';

export function onboardingSeenStorageKey(email) {
  return `onboarding_completed_${email}`;
}

export function isOnboardingSeenLocally(email) {
  if (!email) return false;
  try {
    return localStorage.getItem(onboardingSeenStorageKey(email)) === 'true';
  } catch {
    return false;
  }
}

/** Sync — call before any async work so unmount cannot race. */
export function markOnboardingSeenLocally(email) {
  if (!email) return;
  try {
    localStorage.setItem(onboardingSeenStorageKey(email), 'true');
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Persist onboarding_completed into UserSettings preferences (create or update).
 * Always writes localStorage first.
 */
export async function persistOnboardingCompleted({ email, settings }) {
  if (!email) return;
  markOnboardingSeenLocally(email);

  try {
    if (settings?.id) {
      if (!settings.onboarding_completed) {
        await base44.entities.UserSettings.update(settings.id, { onboarding_completed: true });
      }
    } else {
      const list = await base44.entities.UserSettings.list();
      const row = list?.[0];
      if (row?.id) {
        if (!row.onboarding_completed) {
          await base44.entities.UserSettings.update(row.id, { onboarding_completed: true });
        }
      } else {
        await base44.entities.UserSettings.create({ onboarding_completed: true });
      }
    }
  } catch (err) {
    console.error('Failed to persist onboarding_completed:', err);
  }
}
