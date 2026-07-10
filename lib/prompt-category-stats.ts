import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { AGE_RANGE_LABELS, normalizeAgeRange, type AgeRangeOption } from '@/lib/age-range';
import { normalizeAnalyticsRegion } from '@/lib/user-region';
import { shouldTrackAnalytics } from '@/lib/should-track-analytics';
import {
  PROMPT_DEMAND_CATEGORY_LABELS,
  classifyPromptDemandCategory,
  type PromptDemandCategory,
} from '@/lib/prompt-demand-categories';
import {
  PROMPT_STATS_MIN_COHORT,
  applyCohortThreshold,
  maskCohortCount,
} from '@/lib/cohort-threshold';
import type {
  DemandAnalyticsDashboard,
  DemandGranularity,
} from '@/lib/prompt-category-stats-types';

export type { DemandAnalyticsDashboard, DemandGranularity } from '@/lib/prompt-category-stats-types';

/** UTC Monday (ISO week start) as YYYY-MM-DD. */
export function truncateToWeekStart(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** UTC first of month as YYYY-MM-DD. */
export function truncateToMonthStart(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  return d.toISOString().slice(0, 10);
}

/**
 * Fire-and-forget after a successful generation.
 * Never throws to callers; never blocks the build response.
 */
export async function recordPromptCategoryStat(options: {
  userId: string;
  prompt: string;
}): Promise<void> {
  try {
    if (!(await shouldTrackAnalytics(options.userId))) return;

    const category = classifyPromptDemandCategory(options.prompt);
    const admin = createAdminClient();

    const { data: profile } = await admin
      .from('profiles')
      .select('age_range, analytics_region')
      .eq('id', options.userId)
      .maybeSingle();

    const ageRange = normalizeAgeRange(profile?.age_range) ?? null;
    const regionRaw = profile?.analytics_region
      ? normalizeAnalyticsRegion(profile.analytics_region)
      : null;
    const region = regionRaw && regionRaw !== 'Other' ? regionRaw : null;

    const now = new Date();
    const { error } = await admin.from('prompt_category_stats').insert({
      category,
      age_range: ageRange,
      region,
      period_week: truncateToWeekStart(now),
      period_month: truncateToMonthStart(now),
    });

    if (error) {
      console.error('[prompt_category_stats] insert failed:', error.message);
    }
  } catch (err) {
    console.error('[prompt_category_stats] record failed:', err);
  }
}

function parseGranularity(value: string | null): DemandGranularity {
  if (value === 'week' || value === 'month' || value === 'quarter') return value;
  return 'month';
}

function sinceForGranularity(g: DemandGranularity): { since: Date; label: string } {
  const since = new Date();
  switch (g) {
    case 'week':
      since.setUTCDate(since.getUTCDate() - 12 * 7);
      return { since, label: 'Last 12 weeks' };
    case 'quarter':
      since.setUTCMonth(since.getUTCMonth() - 12);
      return { since, label: 'Last 4 quarters (12 months)' };
    case 'month':
    default:
      since.setUTCMonth(since.getUTCMonth() - 12);
      return { since, label: 'Last 12 months' };
  }
}

function quarterKey(monthDate: string): string {
  const d = new Date(`${monthDate}T00:00:00Z`);
  const q = Math.floor(d.getUTCMonth() / 3) + 1;
  return `${d.getUTCFullYear()}-Q${q}`;
}

function formatPeriodLabel(key: string, g: DemandGranularity): string {
  if (g === 'quarter') return key;
  if (g === 'week') {
    const d = new Date(`${key}T00:00:00Z`);
    return `Week of ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })}`;
  }
  const d = new Date(`${key}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function categoryLabel(slug: string): string {
  return PROMPT_DEMAND_CATEGORY_LABELS[slug as PromptDemandCategory] || slug;
}

function ageLabel(slug: string): string {
  return AGE_RANGE_LABELS[slug as AgeRangeOption] ?? slug;
}

type StatRow = {
  category: string;
  age_range: string | null;
  region: string | null;
  period_week: string;
  period_month: string;
};

function countBy(
  rows: StatRow[],
  keyFn: (row: StatRow) => string | null
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = keyFn(row);
    if (key == null) continue;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
}

/**
 * Admin read path — every breakdown goes through applyCohortThreshold / maskCohortCount.
 */
export async function fetchDemandAnalyticsDashboard(
  granularityParam: string | null
): Promise<DemandAnalyticsDashboard> {
  const granularity = parseGranularity(granularityParam);
  const { since, label: rangeLabel } = sinceForGranularity(granularity);
  const sinceIso = since.toISOString();
  const min = PROMPT_STATS_MIN_COHORT;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('prompt_category_stats')
    .select('category, age_range, region, period_week, period_month')
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data || []) as StatRow[];
  const totalBuilds = maskCohortCount(rows.length, min);

  const categoryCounts = countBy(rows, (r) => r.category);
  const topCategories = applyCohortThreshold(
    [...categoryCounts.entries()]
      .map(([category, count]) => ({
        category,
        label: categoryLabel(category),
        count,
      }))
      .sort((a, b) => b.count - a.count),
    min
  );

  const trendMap = new Map<string, number>();
  for (const row of rows) {
    let key: string;
    if (granularity === 'quarter') {
      key = quarterKey(row.period_month);
    } else if (granularity === 'week') {
      key = row.period_week;
    } else {
      key = row.period_month;
    }
    trendMap.set(key, (trendMap.get(key) || 0) + 1);
  }
  const trend = applyCohortThreshold(
    [...trendMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, count]) => ({
        period,
        label: formatPeriodLabel(period, granularity),
        count,
      })),
    min
  );

  const regionCounts = countBy(rows, (r) => r.region);
  const byRegion = applyCohortThreshold(
    [...regionCounts.entries()]
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count),
    min
  );

  const ageCounts = countBy(rows, (r) => r.age_range);
  const byAgeRange = applyCohortThreshold(
    [...ageCounts.entries()]
      .map(([ageRange, count]) => ({
        ageRange,
        label: ageLabel(ageRange),
        count,
      }))
      .sort((a, b) => b.count - a.count),
    min
  );

  const catRegion = new Map<string, number>();
  for (const row of rows) {
    if (!row.region) continue;
    const key = `${row.category}\0${row.region}`;
    catRegion.set(key, (catRegion.get(key) || 0) + 1);
  }
  const byCategoryAndRegion = applyCohortThreshold(
    [...catRegion.entries()]
      .map(([key, count]) => {
        const [category, region] = key.split('\0');
        return {
          category,
          categoryLabel: categoryLabel(category),
          region,
          count,
        };
      })
      .sort((a, b) => b.count - a.count),
    min
  );

  const catAge = new Map<string, number>();
  for (const row of rows) {
    if (!row.age_range) continue;
    const key = `${row.category}\0${row.age_range}`;
    catAge.set(key, (catAge.get(key) || 0) + 1);
  }
  const byCategoryAndAge = applyCohortThreshold(
    [...catAge.entries()]
      .map(([key, count]) => {
        const [category, ageRange] = key.split('\0');
        return {
          category,
          categoryLabel: categoryLabel(category),
          ageRange,
          ageLabel: ageLabel(ageRange),
          count,
        };
      })
      .sort((a, b) => b.count - a.count),
    min
  );

  return {
    minCohortThreshold: min,
    granularity,
    rangeLabel,
    totalBuilds,
    topCategories,
    trend,
    byRegion,
    byAgeRange,
    byCategoryAndRegion,
    byCategoryAndAge,
  };
}
