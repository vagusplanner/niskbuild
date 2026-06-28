import 'server-only';

import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasPaidTier } from '@/lib/access';
import { TIER_MRR_USD } from '@/lib/layer-overview-stats';

export type RevenueDashboardData = {
  mrrSeries: { month: string; mrrUsd: number; revenueUsd: number }[];
  churnSeries: { month: string; churnRate: number; cancelled: number; paidStart: number }[];
  arpuByTier: { tier: string; arpuUsd: number; subscribers: number; mrrUsd: number }[];
  creditHeatmap: { date: string; creditsUsed: number }[];
  featureAdoption: { feature: string; label: string; users: number; pct: number }[];
  topActiveUsers: {
    userId: string;
    email: string;
    tier: string;
    buildsThisMonth: number;
    lastBuildAt: string | null;
  }[];
  summary: {
    currentMrrUsd: number;
    activeSubscribers: number;
    churnRateLatest: number;
    totalUsers: number;
  };
  stripeConnected: boolean;
};

const PAID_TIERS = ['basic', 'pro', 'agency', 'scale', 'white_label', 'team_enterprise', 'sovereign'];

const FEATURE_LABELS: Record<string, string> = {
  byoc: 'BYOC (Ollama)',
  games: 'Game Builder',
  pwa: 'PWA Export',
  seo_panel: 'SEO Panel',
  google_places: 'Google Places',
  social_publisher: 'Social Publisher',
};

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('default', {
    month: 'short',
    year: '2-digit',
  });
}

function lastNMonths(n: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(monthKey(d));
  }
  return keys;
}

async function fetchStripeMrrAndRevenue(): Promise<{
  currentMrrUsd: number;
  revenueByMonth: Record<string, number>;
}> {
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeKey) {
    return { currentMrrUsd: 0, revenueByMonth: {} };
  }

  const stripe = new Stripe(stripeKey);
  let currentMrrUsd = 0;
  const revenueByMonth: Record<string, number> = {};

  const twelveMonthsAgo = Math.floor(
    new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 11, 1)).getTime() / 1000
  );

  let startingAfter: string | undefined;
  for (;;) {
    const page = await stripe.subscriptions.list({
      status: 'active',
      limit: 100,
      starting_after: startingAfter,
      expand: ['data.items.data.price'],
    });

    for (const sub of page.data) {
      for (const item of sub.items.data) {
        const price = item.price;
        const amount = ((price.unit_amount ?? 0) * (item.quantity ?? 1)) / 100;
        if (price.recurring?.interval === 'month') {
          currentMrrUsd += amount;
        } else if (price.recurring?.interval === 'year') {
          currentMrrUsd += amount / 12;
        }
      }
    }

    if (!page.has_more) break;
    startingAfter = page.data[page.data.length - 1]?.id;
  }

  startingAfter = undefined;
  for (;;) {
    const page = await stripe.invoices.list({
      status: 'paid',
      limit: 100,
      created: { gte: twelveMonthsAgo },
      starting_after: startingAfter,
    });

    for (const inv of page.data) {
      const reason = inv.billing_reason;
      if (
        reason !== 'subscription_create' &&
        reason !== 'subscription_cycle' &&
        reason !== 'subscription_update'
      ) {
        continue;
      }
      const key = monthKey(new Date((inv.created ?? 0) * 1000));
      revenueByMonth[key] = (revenueByMonth[key] ?? 0) + (inv.amount_paid ?? 0) / 100;
    }

    if (!page.has_more) break;
    startingAfter = page.data[page.data.length - 1]?.id;
  }

  return { currentMrrUsd, revenueByMonth };
}

export async function fetchRevenueDashboard(): Promise<RevenueDashboardData> {
  const admin = createAdminClient();
  const monthKeys = lastNMonths(12);

  const [
    profilesResult,
    endedResult,
    heatmapResult,
    featureUsageResult,
    seoResult,
    gamesResult,
    byocResult,
    socialResult,
    topUsersResult,
    stripeData,
  ] = await Promise.all([
    admin.from('profiles').select('id, email, subscription_tier, subscription_status, subscription_ended_at, builds_this_period, last_build_at, created_at'),
    admin.from('profiles').select('subscription_ended_at, subscription_tier, subscription_status').not('subscription_ended_at', 'is', null),
    admin
      .from('metadata_logs')
      .select('created_at, credits_used')
      .gte('created_at', new Date(Date.now() - 90 * 86400000).toISOString()),
    admin.from('feature_usage').select('user_id, feature_key'),
    admin.from('project_seo').select('project_id'),
    admin.from('projects').select('id, user_id').ilike('prompt', '%game%'),
    admin.from('agent_conversations').select('user_id').eq('provider', 'ollama'),
    admin.from('feature_usage').select('user_id').eq('feature_key', 'social_publisher'),
    admin
      .from('profiles')
      .select('id, email, subscription_tier, builds_this_period, last_build_at')
      .order('builds_this_period', { ascending: false })
      .limit(10),
    fetchStripeMrrAndRevenue(),
  ]);

  const profiles = profilesResult.data ?? [];
  const totalUsers = profiles.length;
  const activePaid = profiles.filter(
    (p) => hasPaidTier(p.subscription_tier as string) && p.subscription_status === 'active'
  );

  const mrrSeries = monthKeys.map((key) => {
    const paidInMonth = profiles.filter((p) => {
      if (!hasPaidTier(p.subscription_tier as string)) return false;
      const created = monthKey(new Date(p.created_at as string));
      if (created > key) return false;
      const ended = p.subscription_ended_at
        ? monthKey(new Date(p.subscription_ended_at as string))
        : null;
      if (ended && ended < key) return false;
      return p.subscription_status === 'active' || !ended || ended >= key;
    });

    const estimatedMrr = paidInMonth.reduce(
      (sum, p) => sum + (TIER_MRR_USD[p.subscription_tier as string] ?? 0),
      0
    );

    return {
      month: monthLabel(key),
      mrrUsd: Math.round(stripeData.currentMrrUsd > 0 && key === monthKeys[monthKeys.length - 1]
        ? stripeData.currentMrrUsd
        : estimatedMrr),
      revenueUsd: Math.round((stripeData.revenueByMonth[key] ?? 0) * 100) / 100,
    };
  });

  const churnSeries = monthKeys.map((key) => {
    const [y, m] = key.split('-').map(Number);
    const monthStart = new Date(Date.UTC(y, m - 1, 1));
    const monthEnd = new Date(Date.UTC(y, m, 1));

    const paidStart = profiles.filter((p) => {
      if (!hasPaidTier(p.subscription_tier as string) && !p.subscription_ended_at) return false;
      const created = new Date(p.created_at as string);
      if (created >= monthEnd) return false;
      const ended = p.subscription_ended_at ? new Date(p.subscription_ended_at as string) : null;
      return !ended || ended >= monthStart;
    }).length;

    const cancelled = (endedResult.data ?? []).filter((p) => {
      const ended = new Date(p.subscription_ended_at as string);
      return ended >= monthStart && ended < monthEnd && hasPaidTier(p.subscription_tier as string);
    }).length;

    const churnRate = paidStart > 0 ? Math.round((cancelled / paidStart) * 1000) / 10 : 0;

    return { month: monthLabel(key), churnRate, cancelled, paidStart };
  });

  const arpuByTier = PAID_TIERS.map((tier) => {
    const subs = activePaid.filter((p) => p.subscription_tier === tier);
    const mrrUsd = subs.length * (TIER_MRR_USD[tier] ?? 0);
    return {
      tier,
      subscribers: subs.length,
      mrrUsd,
      arpuUsd: subs.length > 0 ? Math.round((mrrUsd / subs.length) * 100) / 100 : 0,
    };
  }).filter((row) => row.subscribers > 0 || TIER_MRR_USD[row.tier]);

  const heatmapMap: Record<string, number> = {};
  for (const row of heatmapResult.data ?? []) {
    const date = (row.created_at as string).slice(0, 10);
    heatmapMap[date] = (heatmapMap[date] ?? 0) + Number(row.credits_used ?? 1);
  }

  const creditHeatmap: { date: string; creditsUsed: number }[] = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    creditHeatmap.push({ date, creditsUsed: heatmapMap[date] ?? 0 });
  }

  const featureCounts: Record<string, Set<string>> = {
    byoc: new Set((byocResult.data ?? []).map((r) => r.user_id as string)),
    games: new Set((gamesResult.data ?? []).map((r) => r.user_id as string)),
    pwa: new Set(),
    seo_panel: new Set(),
    google_places: new Set(),
    social_publisher: new Set((socialResult.data ?? []).map((r) => r.user_id as string)),
  };

  for (const row of featureUsageResult.data ?? []) {
    const key = row.feature_key as string;
    if (featureCounts[key]) {
      featureCounts[key].add(row.user_id as string);
    }
  }

  const seoProjects = new Set((seoResult.data ?? []).map((r) => r.project_id as string));
  if (seoProjects.size) {
    const { data: seoOwners } = await admin
      .from('projects')
      .select('user_id')
      .in('id', [...seoProjects]);
    for (const p of seoOwners ?? []) {
      featureCounts.seo_panel.add(p.user_id as string);
    }
  }

  const featureAdoption = Object.entries(FEATURE_LABELS).map(([feature, label]) => {
    const users = featureCounts[feature]?.size ?? 0;
    return {
      feature,
      label,
      users,
      pct: totalUsers > 0 ? Math.round((users / totalUsers) * 1000) / 10 : 0,
    };
  });

  const topActiveUsers = (topUsersResult.data ?? []).map((row) => ({
    userId: row.id as string,
    email: (row.email as string) ?? '',
    tier: row.subscription_tier as string,
    buildsThisMonth: (row.builds_this_period as number) ?? 0,
    lastBuildAt: row.last_build_at as string | null,
  }));

  const latestChurn = churnSeries[churnSeries.length - 1]?.churnRate ?? 0;

  return {
    mrrSeries,
    churnSeries,
    arpuByTier,
    creditHeatmap,
    featureAdoption,
    topActiveUsers,
    summary: {
      currentMrrUsd: Math.round(stripeData.currentMrrUsd || mrrSeries[mrrSeries.length - 1]?.mrrUsd || 0),
      activeSubscribers: activePaid.length,
      churnRateLatest: latestChurn,
      totalUsers,
    },
    stripeConnected: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
  };
}
