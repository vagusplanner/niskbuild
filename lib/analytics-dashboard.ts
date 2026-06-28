import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { APP_CATEGORY_LABELS, type AppCategorySlug } from '@/lib/app-categories';
import { AGE_RANGE_LABELS, ANALYTICS_MIN_VOLUME, type AgeRangeOption } from '@/lib/age-range';

export type AnalyticsRange = 'day' | 'week' | 'month' | 'year';

type UsageRow = {
  id: string;
  category_id: string | null;
  region: string;
  event_type: string;
  created_at: string;
  app_categories: { name: string; icon: string } | { name: string; icon: string }[] | null;
};

function normalizeCategoryJoin(
  value: UsageRow['app_categories']
): { name: string; icon: string } | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export type AnalyticsDashboardData = {
  range: AnalyticsRange;
  rangeLabel: string;
  minVolumeThreshold: number;
  totalSignups: number;
  totalBuilds: number;
  mostActiveCategory: { name: string; icon: string; count: number } | null;
  mostActiveRegion: { name: string; count: number } | null;
  mostActiveAgeRange: { label: string; count: number } | null;
  buildsByCategory: { slug: string; label: string; icon: string; count: number }[];
  buildsByRegion: { region: string; count: number }[];
  buildsByAgeRange: { ageRange: string; label: string; count: number }[];
  buildsByAgeAndCategory: {
    ageRange: string;
    ageLabel: string;
    categorySlug: string;
    categoryLabel: string;
    categoryIcon: string;
    count: number;
  }[];
  buildsByTownAndCategory: {
    town: string;
    categorySlug: string;
    categoryLabel: string;
    categoryIcon: string;
    count: number;
  }[];
  buildsByTown: { town: string; count: number }[];
  trend: { label: string; builds: number; signups: number }[];
};

function parseRange(value: string | null): AnalyticsRange {
  if (value === 'day' || value === 'week' || value === 'month' || value === 'year') {
    return value;
  }
  return 'month';
}

function rangeSince(range: AnalyticsRange): Date {
  const since = new Date();
  switch (range) {
    case 'day':
      since.setHours(since.getHours() - 24);
      break;
    case 'week':
      since.setDate(since.getDate() - 7);
      break;
    case 'month':
      since.setDate(since.getDate() - 30);
      break;
    case 'year':
      since.setDate(since.getDate() - 365);
      break;
  }
  return since;
}

function rangeLabel(range: AnalyticsRange): string {
  switch (range) {
    case 'day':
      return 'Last 24 hours';
    case 'week':
      return 'Last 7 days';
    case 'month':
      return 'Last 30 days';
    case 'year':
      return 'Last 12 months';
  }
}

function bucketKey(date: Date, range: AnalyticsRange): string {
  if (range === 'day') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
  }
  if (range === 'year') {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    return weekStart.toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

function formatBucketLabel(key: string, range: AnalyticsRange): string {
  if (range === 'day') {
    const hour = key.split(' ')[1]?.replace(':00', '') ?? key;
    return `${hour}h`;
  }
  if (range === 'year') {
    const d = new Date(`${key}T00:00:00`);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  const d = new Date(`${key}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function buildTrendBuckets(range: AnalyticsRange): string[] {
  const keys: string[] = [];
  const now = new Date();

  if (range === 'day') {
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(d.getHours() - i, 0, 0, 0);
      keys.push(bucketKey(d, range));
    }
    return keys;
  }

  if (range === 'week') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      keys.push(bucketKey(d, range));
    }
    return keys;
  }

  if (range === 'month') {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      keys.push(bucketKey(d, range));
    }
    return keys;
  }

  for (let i = 51; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    keys.push(bucketKey(d, range));
  }
  return [...new Set(keys)];
}

function ageLabel(slug: string): string {
  return AGE_RANGE_LABELS[slug as AgeRangeOption] ?? slug;
}

async function fetchRpcRows<T>(
  admin: ReturnType<typeof createAdminClient>,
  fn: string,
  sinceIso: string
): Promise<T[]> {
  const { data, error } = await admin.rpc(fn, { since_ts: sinceIso });
  if (error) {
    console.error(`RPC ${fn} failed:`, error.message);
    return [];
  }
  return (data || []) as T[];
}

export async function fetchAnalyticsDashboard(
  rangeParam: string | null
): Promise<AnalyticsDashboardData> {
  const range = parseRange(rangeParam);
  const since = rangeSince(range);
  const sinceIso = since.toISOString();
  const admin = createAdminClient();

  const [
    { data: rawRows, error },
    ageRangeRows,
    ageCategoryRows,
    townCategoryRows,
    townRows,
  ] = await Promise.all([
    admin
      .from('usage_events')
      .select('id, category_id, region, event_type, created_at, app_categories(name, icon)')
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: true }),
    fetchRpcRows<{ age_range: string; event_count: number }>(
      admin,
      'analytics_builds_by_age_range',
      sinceIso
    ),
    fetchRpcRows<{
      age_range: string;
      category_slug: string;
      category_icon: string;
      event_count: number;
    }>(admin, 'analytics_builds_by_age_category', sinceIso),
    fetchRpcRows<{
      town: string;
      category_slug: string;
      category_icon: string;
      event_count: number;
    }>(admin, 'analytics_builds_by_town_category', sinceIso),
    fetchRpcRows<{ town: string; event_count: number }>(
      admin,
      'analytics_builds_by_town',
      sinceIso
    ),
  ]);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (rawRows || []) as UsageRow[];

  let totalSignups = 0;
  let totalBuilds = 0;
  const categoryCounts = new Map<string, { slug: string; icon: string; count: number }>();
  const regionCounts = new Map<string, number>();
  const trendBuilds = new Map<string, number>();
  const trendSignups = new Map<string, number>();

  for (const row of rows) {
    const bucket = bucketKey(new Date(row.created_at), range);

    if (row.event_type === 'signup') {
      totalSignups++;
      trendSignups.set(bucket, (trendSignups.get(bucket) || 0) + 1);
    }

    if (row.event_type === 'build') {
      totalBuilds++;
      trendBuilds.set(bucket, (trendBuilds.get(bucket) || 0) + 1);

      const category = normalizeCategoryJoin(row.app_categories);
      const slug = (category?.name || 'other') as AppCategorySlug;
      const icon = category?.icon || '📦';
      const prev = categoryCounts.get(slug) || { slug, icon, count: 0 };
      categoryCounts.set(slug, { ...prev, count: prev.count + 1 });

      const region = row.region || 'Other';
      regionCounts.set(region, (regionCounts.get(region) || 0) + 1);
    }
  }

  const buildsByCategory = [...categoryCounts.values()]
    .map((c) => ({
      slug: c.slug,
      label: APP_CATEGORY_LABELS[c.slug as AppCategorySlug] || c.slug,
      icon: c.icon,
      count: c.count,
    }))
    .sort((a, b) => b.count - a.count);

  const buildsByRegion = [...regionCounts.entries()]
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count);

  const buildsByAgeRange = ageRangeRows
    .map((row) => ({
      ageRange: row.age_range,
      label: ageLabel(row.age_range),
      count: Number(row.event_count) || 0,
    }))
    .sort((a, b) => b.count - a.count);

  const buildsByAgeAndCategory = ageCategoryRows.map((row) => ({
    ageRange: row.age_range,
    ageLabel: ageLabel(row.age_range),
    categorySlug: row.category_slug,
    categoryLabel: APP_CATEGORY_LABELS[row.category_slug as AppCategorySlug] || row.category_slug,
    categoryIcon: row.category_icon,
    count: Number(row.event_count) || 0,
  }));

  const buildsByTownAndCategory = townCategoryRows.map((row) => ({
    town: row.town,
    categorySlug: row.category_slug,
    categoryLabel: APP_CATEGORY_LABELS[row.category_slug as AppCategorySlug] || row.category_slug,
    categoryIcon: row.category_icon,
    count: Number(row.event_count) || 0,
  }));

  const buildsByTown = townRows.map((row) => ({
    town: row.town,
    count: Number(row.event_count) || 0,
  }));

  const mostActiveCategory = buildsByCategory[0]
    ? {
        name: buildsByCategory[0].label,
        icon: buildsByCategory[0].icon,
        count: buildsByCategory[0].count,
      }
    : null;

  const mostActiveRegion = buildsByRegion[0]
    ? { name: buildsByRegion[0].region, count: buildsByRegion[0].count }
    : null;

  const mostActiveAgeRange = buildsByAgeRange[0]
    ? { label: buildsByAgeRange[0].label, count: buildsByAgeRange[0].count }
    : null;

  const trend = buildTrendBuckets(range).map((key) => ({
    label: formatBucketLabel(key, range),
    builds: trendBuilds.get(key) || 0,
    signups: trendSignups.get(key) || 0,
  }));

  return {
    range,
    rangeLabel: rangeLabel(range),
    minVolumeThreshold: ANALYTICS_MIN_VOLUME,
    totalSignups,
    totalBuilds,
    mostActiveCategory,
    mostActiveRegion,
    mostActiveAgeRange,
    buildsByCategory,
    buildsByRegion,
    buildsByAgeRange,
    buildsByAgeAndCategory,
    buildsByTownAndCategory,
    buildsByTown,
    trend,
  };
}
