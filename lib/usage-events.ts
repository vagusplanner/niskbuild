import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { classifyAppCategory } from '@/lib/app-category-classifier';
import { normalizeCategorySlug, type AppCategorySlug } from '@/lib/app-categories';
import { shouldTrackAnalytics } from '@/lib/should-track-analytics';
import { normalizeAgeRange, sanitizeTown, type AgeRangeOption } from '@/lib/age-range';
import { resolveCoarseTownFromIp } from '@/lib/coarse-town';
import { normalizeAnalyticsRegion, regionFromLocale } from '@/lib/user-region';

export type UsageEventType = 'build' | 'export' | 'signup';

type CategoryRow = { id: string; name: string };

let categoryCache: Map<string, string> | null = null;
let categoryCacheAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function loadCategoryIdMap(): Promise<Map<string, string>> {
  const now = Date.now();
  if (categoryCache && now - categoryCacheAt < CACHE_TTL_MS) {
    return categoryCache;
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from('app_categories').select('id, name');
  if (error) {
    console.error('Failed to load app_categories:', error.message);
    return categoryCache ?? new Map();
  }

  const map = new Map<string, string>();
  for (const row of (data || []) as CategoryRow[]) {
    map.set(row.name, row.id);
  }
  categoryCache = map;
  categoryCacheAt = now;
  return map;
}

async function categoryIdForSlug(slug: AppCategorySlug): Promise<string | null> {
  const map = await loadCategoryIdMap();
  return map.get(slug) ?? map.get('other') ?? null;
}

async function resolveUserRegion(userId: string, locale?: string): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('profiles')
    .select('analytics_region')
    .eq('id', userId)
    .maybeSingle();

  if (data?.analytics_region) {
    return normalizeAnalyticsRegion(data.analytics_region);
  }

  return locale ? regionFromLocale(locale) : 'Other';
}

async function resolveEventDemographics(
  userId: string,
  clientIp?: string | null
): Promise<{ ageRange: AgeRangeOption; town: string | null }> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('profiles')
    .select('age_range, town')
    .eq('id', userId)
    .maybeSingle();

  const ageRange = normalizeAgeRange(data?.age_range) ?? 'prefer not to say';

  let town = sanitizeTown(data?.town ?? null);
  if (!town && clientIp) {
    town = await resolveCoarseTownFromIp(clientIp);
  }

  return { ageRange, town };
}

async function resolveBuildCategoryId(
  prompt: string,
  projectId?: string | null
): Promise<string | null> {
  const admin = createAdminClient();
  const slugFromPrompt = async () => categoryIdForSlug(await classifyAppCategory(prompt));

  if (projectId) {
    const { data: project } = await admin
      .from('projects')
      .select('category_id')
      .eq('id', projectId)
      .maybeSingle();

    if (project?.category_id) {
      return project.category_id as string;
    }

    const slug = await classifyAppCategory(prompt);
    const categoryId = await categoryIdForSlug(slug);
    if (categoryId) {
      await admin.from('projects').update({ category_id: categoryId }).eq('id', projectId);
    }
    return categoryId;
  }

  return slugFromPrompt();
}

export async function saveProfileDemographics(
  userId: string,
  demographics: { ageRange?: string | null; town?: string | null }
): Promise<void> {
  const admin = createAdminClient();
  const update: Record<string, string | null> = {};

  const ageRange = normalizeAgeRange(demographics.ageRange);
  if (ageRange) update.age_range = ageRange;
  else if (demographics.ageRange === 'prefer not to say' || demographics.ageRange === '') {
    update.age_range = 'prefer not to say';
  }

  const town = sanitizeTown(demographics.town);
  if (town) update.town = town;

  if (Object.keys(update).length === 0) return;

  const { error } = await admin.from('profiles').update(update).eq('id', userId);
  if (error) {
    console.error('saveProfileDemographics error:', error.message);
  }
}

export async function recordUsageEvent(options: {
  eventType: UsageEventType;
  userId: string;
  prompt?: string;
  projectId?: string | null;
  locale?: string;
  clientIp?: string | null;
}): Promise<void> {
  try {
    if (!(await shouldTrackAnalytics(options.userId))) {
      return;
    }

    const admin = createAdminClient();
    const region = await resolveUserRegion(options.userId, options.locale);
    const { ageRange, town } = await resolveEventDemographics(options.userId, options.clientIp);

    let categoryId: string | null = null;
    if (options.eventType === 'build' && options.prompt?.trim()) {
      categoryId = await resolveBuildCategoryId(options.prompt, options.projectId);
    } else if (options.eventType === 'export' && options.projectId) {
      const { data: project } = await admin
        .from('projects')
        .select('category_id')
        .eq('id', options.projectId)
        .maybeSingle();
      categoryId = (project?.category_id as string | null) ?? null;
      if (!categoryId && options.prompt?.trim()) {
        categoryId = await resolveBuildCategoryId(options.prompt, options.projectId);
      }
    }

    const { error } = await admin.from('usage_events').insert({
      category_id: categoryId,
      region,
      town,
      age_range: ageRange,
      event_type: options.eventType,
    });

    if (error) {
      console.error('usage_events insert error:', error.message);
    }
  } catch (err) {
    console.error('recordUsageEvent failed:', err);
  }
}

/** Record signup once per user (internal dedup — not exposed in analytics dashboard). */
export async function recordSignupIfNewUser(
  userId: string,
  options?: { locale?: string; clientIp?: string | null }
): Promise<void> {
  try {
    if (!(await shouldTrackAnalytics(userId))) {
      return;
    }

    const admin = createAdminClient();

    const { data: existing } = await admin
      .from('analytics_signup_recorded')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) return;

    await recordUsageEvent({
      eventType: 'signup',
      userId,
      locale: options?.locale,
      clientIp: options?.clientIp,
    });

    await admin.from('analytics_signup_recorded').insert({ user_id: userId });
  } catch (err) {
    console.error('recordSignupIfNewUser failed:', err);
  }
}

export function categorySlugFromName(name: string | null | undefined): AppCategorySlug {
  return normalizeCategorySlug(name);
}
