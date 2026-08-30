import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { resolvePaidIslamicAccess } from '@/lib/vp-islamic-access';
import { loadUserPlanContext } from '@/lib/vp-usage-meter';
import {
  canSendArt9CategoryToAi,
  parseVpGdprConsents,
  type VpArt9Category,
} from './tables';

export const VP_ART9_GROQ_UNAVAILABLE_MESSAGE =
  'This feature is temporarily unavailable — please try again shortly';

export const VP_ART9_CONSENT_ERROR =
  'AI processing of this data category is blocked because Article 9 consent is not active. You can update consents in Account → Privacy & Consent.';

const RELIGIOUS_TEXT_PATTERN =
  /\b(prayer|prayers|salah|salat|namaz|hadith|quran|qur'an|islam|islamic|mosque|masjid|ramadan|eid|fajr|dhuhr|zuhr|asr|maghrib|isha|taraweeh|umrah|hajj|dhikr|zakat|sunnah)\b/i;

const HEALTH_TEXT_PATTERN =
  /\b(health|medical|medication|medicine|doctor|physician|symptom|symptoms|diagnosis|therapy|therapist|wellness|mental health|anxiety|depression|period|menstrual|sleep|insulin|prescription|hospital|clinic|treatment)\b/i;

/** Art.9-tagged calls must not fall back to undisclosed subprocessors (Together/Anthropic). */
export function requiresGroqOnlyProvider(categories: VpArt9Category[]): boolean {
  return categories.length > 0;
}

/** Scan free-text (voice commands, titles) for likely Art.9 categories before sending to AI. */
export function detectArt9CategoriesFromText(text: string): VpArt9Category[] {
  const categories: VpArt9Category[] = [];
  const trimmed = text.trim();
  if (!trimmed) return categories;
  if (RELIGIOUS_TEXT_PATTERN.test(trimmed)) categories.push('religious');
  if (HEALTH_TEXT_PATTERN.test(trimmed)) categories.push('health');
  return categories;
}

export function mergeArt9Categories(...lists: VpArt9Category[][]): VpArt9Category[] {
  return [...new Set(lists.flat())];
}

export type Art9AiAccessResult =
  | { ok: true; groqOnly: boolean }
  | {
      ok: false;
      error: string;
      code: 'GDPR_ART9_CONSENT_REQUIRED' | 'ISLAMIC_PLAN_REQUIRED' | 'VP_ART9_CONSENT_CHECK_FAILED';
      status: 403 | 402 | 503;
      category?: VpArt9Category;
    };

/**
 * Verify Art.9 consent (and Islamic plan for religious AI) before forwarding content to AI.
 * When categories are non-empty, callers must pass them to vp-ai-providers for Groq-only routing.
 */
export async function verifyArt9AiAccess(
  userId: string,
  categories: VpArt9Category[]
): Promise<Art9AiAccessResult> {
  if (categories.length === 0) {
    return { ok: true, groqOnly: false };
  }

  try {
    const admin = createAdminClient();
    const { data: settingsRows } = await admin
      .schema('firstparty')
      .from('vp_user_settings')
      .select('preferences')
      .eq('user_id', userId)
      .limit(1);

    const consents = parseVpGdprConsents(settingsRows?.[0]?.preferences);

    for (const category of categories) {
      if (!canSendArt9CategoryToAi(consents, category)) {
        return {
          ok: false,
          error: VP_ART9_CONSENT_ERROR,
          code: 'GDPR_ART9_CONSENT_REQUIRED',
          status: 403,
          category,
        };
      }
    }

    if (categories.includes('religious')) {
      const { subscriptions, profile } = await loadUserPlanContext(admin, userId);
      const islamic = resolvePaidIslamicAccess({ subscriptions, profile });
      if (!islamic.hasPaidIslamicAccess) {
        return {
          ok: false,
          error:
            'Islamic AI features require an active Islamic Edition subscription. Upgrade in Billing.',
          code: 'ISLAMIC_PLAN_REQUIRED',
          status: 402,
        };
      }
    }

    return { ok: true, groqOnly: true };
  } catch (error) {
    console.error('VP Art.9 AI consent check failed:', error);
    return {
      ok: false,
      error: 'Unable to verify privacy consents for this AI request',
      code: 'VP_ART9_CONSENT_CHECK_FAILED',
      status: 503,
    };
  }
}

export function aiUnavailableMessage(categories: VpArt9Category[]): string {
  return requiresGroqOnlyProvider(categories)
    ? VP_ART9_GROQ_UNAVAILABLE_MESSAGE
    : 'AI is temporarily unavailable';
}
