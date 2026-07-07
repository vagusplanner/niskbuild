import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { PAID_TIERS } from '@/lib/access';

export type LegacyAdminDashboardData = {
  totalUsers: number;
  totalProjects: number;
  totalBuilds: number;
  buildsToday: number;
  activeUsers7d: number;
  conversionRate: number;
  proUsers: number;
  agencyUsers: number;
  scaleUsers: number;
  whiteLabelUsers: number;
  buildsByDay: { date: string; count: number }[];
  topFeatures: { feature: string; count: number }[];
  topCategories: { category: string; count: number }[];
};

export async function fetchLegacyAdminDashboard(): Promise<LegacyAdminDashboardData> {
  const admin = createAdminClient();

  const [
    { count: totalUsers },
    { count: totalProjects },
    { count: totalBuilds },
    buildsTodayResult,
    activeUsersResult,
    tierCounts,
    buildsData,
    featuresData,
    categoriesData,
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('projects').select('*', { count: 'exact', head: true }),
    admin.from('metadata_logs').select('*', { count: 'exact', head: true }),
    (async () => {
      const today = new Date().toISOString().split('T')[0];
      return admin
        .from('metadata_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);
    })(),
    (async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return admin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_seen_at', sevenDaysAgo.toISOString());
    })(),
    admin.from('profiles').select('subscription_tier'),
    (async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return admin
        .from('metadata_logs')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString());
    })(),
    admin.from('metadata_logs').select('features_list').not('features_list', 'is', null),
    admin.from('metadata_logs').select('app_category'),
  ]);

  const tierRows = tierCounts.data ?? [];
  const countTier = (tier: string) =>
    tierRows.filter((row) => row.subscription_tier === tier).length;

  const proUsers = countTier('pro');
  const agencyUsers = countTier('agency');
  const scaleUsers = countTier('scale');
  const whiteLabelUsers = countTier('white_label');
  const paidUsers = tierRows.filter(
    (row) => row.subscription_tier && (PAID_TIERS as readonly string[]).includes(row.subscription_tier)
  ).length;
  const conversionRate = totalUsers ? (paidUsers / (totalUsers || 1)) * 100 : 0;

  type BuildLogRow = { created_at: string | null };
  const buildRows = (buildsData.data ?? []) as BuildLogRow[];

  const buildsByDay: { date: string; count: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const count = buildRows.filter((b) => b.created_at?.startsWith(dateStr)).length || 0;
    buildsByDay.unshift({ date: dateStr, count });
  }

  const featureCounts: Record<string, number> = {};
  type FeatureLogRow = { features_list: string[] | null };
  (featuresData.data as FeatureLogRow[] | null)?.forEach((log) => {
    log.features_list?.forEach((feature: string) => {
      featureCounts[feature] = (featureCounts[feature] || 0) + 1;
    });
  });
  const topFeatures = Object.entries(featureCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([feature, count]) => ({ feature, count }));

  const categoryCounts: Record<string, number> = {};
  type CategoryLogRow = { app_category: string | null };
  (categoriesData.data as CategoryLogRow[] | null)?.forEach((log) => {
    const cat = log.app_category || 'unknown';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, count]) => ({ category, count }));

  return {
    totalUsers: totalUsers || 0,
    totalProjects: totalProjects || 0,
    totalBuilds: totalBuilds || 0,
    buildsToday: buildsTodayResult.count || 0,
    activeUsers7d: activeUsersResult.count || 0,
    conversionRate,
    proUsers,
    agencyUsers,
    scaleUsers,
    whiteLabelUsers,
    buildsByDay,
    topFeatures,
    topCategories,
  };
}
