import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { hasPaidTier } from '@/lib/access';
import { monthlyReportKey } from '@/lib/email/constants';
import {
  sendDay14NpsEmail,
  sendDay1NoBuildEmail,
  sendDay3FeatureTipEmail,
  sendDay7SocialProofEmail,
  sendInactive14dEmail,
  sendMonthlyReportEmail,
  sendWinback30dEmail,
  sendWinback7dEmail,
} from '@/lib/email/lifecycle';
import { hasEmailBeenSent } from '@/lib/email/send-log';

const MS_DAY = 24 * 60 * 60 * 1000;

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * MS_DAY);
}

function inWindow(createdAt: string, minDays: number, maxDays: number): boolean {
  const created = new Date(createdAt).getTime();
  const ageDays = (Date.now() - created) / MS_DAY;
  return ageDays >= minDays && ageDays < maxDays;
}

function hasRecentBuild(lastBuildAt: string | null, withinDays: number): boolean {
  if (!lastBuildAt) return false;
  return new Date(lastBuildAt) >= daysAgo(withinDays);
}

export async function processEmailLifecycleCron(): Promise<Record<string, number>> {
  const admin = createAdminClient();
  const stats: Record<string, number> = {
    day1: 0,
    day3: 0,
    day7: 0,
    day14: 0,
    inactive14d: 0,
    winback7d: 0,
    winback30d: 0,
    monthlyReport: 0,
  };

  const { data: profiles, error } = await admin
    .from('profiles')
    .select(
      'id, email, created_at, last_build_at, builds_this_period, subscription_tier, subscription_status, subscription_ended_at, cloud_credits_remaining'
    )
    .not('email', 'is', null);

  if (error || !profiles) {
    console.error('processEmailLifecycleCron:', error?.message);
    return stats;
  }

  const now = new Date();
  const isFirstOfMonth = now.getDate() === 1;
  const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });
  const reportKey = monthlyReportKey(now.getFullYear(), now.getMonth() + 1);

  for (const row of profiles) {
    const userId = row.id as string;
    const email = row.email as string;
    if (!email) continue;

    const createdAt = row.created_at as string;
    const lastBuild = row.last_build_at as string | null;
    const tier = row.subscription_tier as string;
    const status = row.subscription_status as string;
    const endedAt = row.subscription_ended_at as string | null;
    const paidActive = hasPaidTier(tier) && status === 'active';

    // Onboarding drips (all users with email)
    if (inWindow(createdAt, 1, 1.5) && !lastBuild) {
      if (await sendDay1NoBuildEmail(userId, email)) stats.day1++;
    }

    if (inWindow(createdAt, 3, 3.5) && hasRecentBuild(lastBuild, 14)) {
      if (await sendDay3FeatureTipEmail(userId, email)) stats.day3++;
    }

    if (inWindow(createdAt, 7, 7.5) && hasRecentBuild(lastBuild, 14)) {
      if (await sendDay7SocialProofEmail(userId, email)) stats.day7++;
    }

    if (inWindow(createdAt, 14, 14.5) && hasRecentBuild(lastBuild, 21)) {
      if (await sendDay14NpsEmail(userId, email)) stats.day14++;
    }

    // Paid inactive 14d (cron; admin can also manual send)
    if (paidActive) {
      const inactiveDays = lastBuild
        ? (Date.now() - new Date(lastBuild).getTime()) / MS_DAY
        : (Date.now() - new Date(createdAt).getTime()) / MS_DAY;

      if (inactiveDays >= 14) {
        const already = await hasEmailBeenSent(userId, 'inactive_14d');
        if (!already && (await sendInactive14dEmail(userId, email))) {
          stats.inactive14d++;
        }
      }
    }

    // Win-back sequences after subscription ended
    if (endedAt && !paidActive) {
      const daysSinceEnd = (Date.now() - new Date(endedAt).getTime()) / MS_DAY;
      if (daysSinceEnd >= 7 && daysSinceEnd < 8) {
        if (await sendWinback7dEmail(userId, email)) stats.winback7d++;
      }
      if (daysSinceEnd >= 30 && daysSinceEnd < 31) {
        if (await sendWinback30dEmail(userId, email)) stats.winback30d++;
      }
    }

    // Monthly report — 1st of month, paid active only
    if (isFirstOfMonth && paidActive) {
      const { count: projectCount } = await admin
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      const buildsThisPeriod = (row.builds_this_period as number) ?? 0;

      if (
        await sendMonthlyReportEmail(
          userId,
          email,
          {
            builds: buildsThisPeriod,
            projects: projectCount ?? 0,
            creditsRemaining: (row.cloud_credits_remaining as number) ?? 0,
            monthLabel,
          },
          reportKey
        )
      ) {
        stats.monthlyReport++;
        await admin.from('profiles').update({ builds_this_period: 0 }).eq('id', userId);
      }
    }
  }

  return stats;
}
