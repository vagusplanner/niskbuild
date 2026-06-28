import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export const TIER_MRR_USD: Record<string, number> = {
  basic: 69,
  pro: 129,
  agency: 299,
  scale: 799,
  white_label: 1199,
  team_enterprise: 1999,
  sovereign: 3999,
};

export type ExportJobRow = {
  id: string;
  requester_user_id: string;
  app_reference: Record<string, unknown>;
  status: string;
  fee_cents: number;
  created_at: string;
};

export type LayerOverviewStats = {
  platform: {
    subscribers: number;
    mrrUsd: number;
    activeProjects: number;
  };
  firstParty: {
    appCount: number;
    primaryAppName: string | null;
    primaryAppStatus: string | null;
    endUsers: number;
    appStoreLabel: string;
  };
  marketplace: {
    salesCentsThisMonth: number;
    clonesSoldThisMonth: number;
    exportJobsPending: number;
  };
  exportQueue: Array<{
    id: string;
    requesterEmail: string;
    appName: string;
    status: string;
    feeCents: number;
  }>;
};

function monthStartIsoUtc(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function appNameFromReference(ref: Record<string, unknown>): string {
  const candidates = [ref.title, ref.appName, ref.name, ref.app_name];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return 'Unknown app';
}

function appStoreLabel(status: string | null | undefined): string {
  if (status === 'active') return 'Live';
  if (status === 'draft') return 'Draft';
  if (status === 'inactive') return 'Inactive';
  if (status === 'archived') return 'Archived';
  return 'Unknown';
}

export async function fetchLayerOverviewStats(): Promise<LayerOverviewStats> {
  const db = createAdminClient();
  const monthStart = monthStartIsoUtc();
  const firstparty = db.schema('firstparty');
  const marketplace = db.schema('marketplace');

  const [
    profilesResult,
    projectsResult,
    appsResult,
    vpUsersResult,
    salesResult,
    purchasesResult,
    pendingExportsResult,
    exportJobsResult,
  ] = await Promise.all([
    db.from('profiles').select('subscription_tier, subscription_status'),
    db.from('projects').select('*', { count: 'exact', head: true }),
    firstparty.from('app_registry').select('app_name, status').order('created_at', { ascending: true }),
    firstparty.from('vp_user_settings').select('*', { count: 'exact', head: true }),
    marketplace.rpc('sales_total_cents_this_month'),
    marketplace
      .from('purchases')
      .select('*', { count: 'exact', head: true })
      .gte('purchased_at', monthStart),
    marketplace
      .from('export_jobs')
      .select('*', { count: 'exact', head: true })
      .in('status', ['requested', 'in_progress', 'submitted']),
    marketplace
      .from('export_jobs')
      .select('id, requester_user_id, app_reference, status, fee_cents, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const profiles = profilesResult.data ?? [];
  const subscribers = profiles.length;
  let mrrUsd = 0;
  for (const profile of profiles) {
    if (profile.subscription_status !== 'active') continue;
    const tier = profile.subscription_tier ?? 'free';
    mrrUsd += TIER_MRR_USD[tier] ?? 0;
  }

  const apps = appsResult.data ?? [];
  const vagusPlanner = apps.find((a) =>
    a.app_name?.toLowerCase().includes('vagus planner')
  );
  const primaryApp = vagusPlanner ?? apps[0] ?? null;

  const exportJobs = (exportJobsResult.data ?? []) as ExportJobRow[];
  const requesterIds = [...new Set(exportJobs.map((j) => j.requester_user_id))];
  const emailByUserId = new Map<string, string>();

  if (requesterIds.length) {
    const { data: requesters } = await db
      .from('profiles')
      .select('id, email')
      .in('id', requesterIds);
    for (const row of requesters ?? []) {
      emailByUserId.set(row.id, row.email);
    }
  }

  return {
    platform: {
      subscribers,
      mrrUsd,
      activeProjects: projectsResult.count ?? 0,
    },
    firstParty: {
      appCount: apps.length,
      primaryAppName: primaryApp?.app_name ?? null,
      primaryAppStatus: primaryApp?.status ?? null,
      endUsers: vpUsersResult.count ?? 0,
      appStoreLabel: appStoreLabel(primaryApp?.status),
    },
    marketplace: {
      salesCentsThisMonth: Number(salesResult.data ?? 0),
      clonesSoldThisMonth: purchasesResult.count ?? 0,
      exportJobsPending: pendingExportsResult.count ?? 0,
    },
    exportQueue: exportJobs.map((job) => ({
      id: job.id,
      requesterEmail: emailByUserId.get(job.requester_user_id) ?? 'Unknown',
      appName: appNameFromReference(job.app_reference ?? {}),
      status: job.status,
      feeCents: job.fee_cents,
    })),
  };
}

export function formatUsdFromCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function exportStatusLabel(status: string): string {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function exportStatusClass(status: string): string {
  switch (status) {
    case 'in_progress':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'requested':
      return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    case 'submitted':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'approved':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'rejected':
      return 'bg-red-500/15 text-red-400 border-red-500/30';
    default:
      return 'bg-[var(--surface-elevated)] text-nisk-muted border-nisk';
  }
}
