import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  canUseLocalOllama,
  getCloudCreditsForTier,
  getNextTier,
  tierDisplayName,
} from '@/lib/tier-config';
import { EMAIL_TEMPLATE } from '@/lib/email/constants';
import { sendLifecycleEmail, type LifecycleSendResult } from '@/lib/email/send-log';
import { createWinbackPromoCode } from '@/lib/email/stripe-promo';
import * as T from '@/lib/email/templates';

function estimateDaysUntilEmpty(creditsUsed: number, creditsRemaining: number): number {
  const dayOfMonth = new Date().getDate();
  const dailyRate = creditsUsed / Math.max(dayOfMonth, 1);
  if (dailyRate <= 0) return creditsRemaining > 0 ? 30 : 0;
  return Math.max(1, Math.ceil(creditsRemaining / dailyRate));
}

export async function resetCreditAlertFlags(userId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from('profiles')
    .update({
      credit_alert_80_sent: false,
      credit_alert_100_sent: false,
    })
    .eq('id', userId);
}

/** Credit usage alerts — replaces inline HTML in lib/usage-alerts.ts */
export async function maybeSendUsageAlert(
  userId: string,
  email: string | undefined,
  tier: string,
  creditsRemaining: number
): Promise<void> {
  const admin = createAdminClient();

  let to = email;
  if (!to) {
    const { data } = await admin.from('profiles').select('email').eq('id', userId).single();
    to = data?.email ?? undefined;
  }
  if (!to) return;

  const allowance = getCloudCreditsForTier(tier);
  if (allowance <= 0) return;

  const creditsUsed = allowance - creditsRemaining;
  const usagePct = (creditsUsed / allowance) * 100;

  const { data: profile } = await admin
    .from('profiles')
    .select('credit_alert_80_sent, credit_alert_100_sent')
    .eq('id', userId)
    .single();

  if (creditsRemaining <= 0 && !profile?.credit_alert_100_sent) {
    await sendLifecycleEmail({
      userId,
      to,
      templateKey: EMAIL_TEMPLATE.CREDIT_0,
      subject: 'You have run out of NiskBuild builds',
      html: T.credit0Html(),
    });
    await admin.from('profiles').update({ credit_alert_100_sent: true }).eq('id', userId);
    return;
  }

  if (usagePct < 80 || profile?.credit_alert_80_sent) return;

  const nextPlan = getNextTier(tier);
  const upgradeBlock = nextPlan
    ? `<p style="color:#94a3b8;margin:12px 0;"><strong style="color:#fff;">(1) Upgrade to ${nextPlan.name}</strong> for ${nextPlan.credits.toLocaleString()} builds/month.</p>`
    : '';

  await sendLifecycleEmail({
    userId,
    to,
    templateKey: EMAIL_TEMPLATE.CREDIT_80,
    subject: 'You have used 80% of your NiskBuild builds this month',
    html: T.credit80Html({
      creditsUsed,
      allowance,
      tierName: tierDisplayName(tier),
      daysLeft: estimateDaysUntilEmpty(creditsUsed, creditsRemaining),
      upgradeBlock,
      byocNote: canUseLocalOllama(tier)
        ? 'You already have BYOC Ollama — enable it in Builder for unlimited local builds.'
        : 'Enable BYOC Ollama for unlimited local builds (Pro Worker and above).',
    }),
  });

  await admin.from('profiles').update({ credit_alert_80_sent: true }).eq('id', userId);
}

async function sendLifecycle(params: Parameters<typeof sendLifecycleEmail>[0]): Promise<boolean> {
  const result = await sendLifecycleEmail(params);
  return result.ok;
}

export async function sendWelcomeEmail(userId: string, email: string): Promise<boolean> {
  return sendLifecycle({
    userId,
    to: email,
    templateKey: EMAIL_TEMPLATE.WELCOME,
    subject: 'Welcome to NiskBuild',
    html: T.welcomeEmailHtml(),
  });
}

export async function sendDay1NoBuildEmail(userId: string, email: string): Promise<boolean> {
  return sendLifecycle({
    userId,
    to: email,
    templateKey: EMAIL_TEMPLATE.DAY_1_NO_BUILD,
    subject: 'Ready to build your first app?',
    html: T.day1NoBuildHtml(),
  });
}

export async function sendDay3FeatureTipEmail(userId: string, email: string): Promise<boolean> {
  return sendLifecycle({
    userId,
    to: email,
    templateKey: EMAIL_TEMPLATE.DAY_3_FEATURE_TIP,
    subject: 'Try the Game Builder on NiskBuild',
    html: T.day3FeatureTipHtml(),
  });
}

export async function sendDay7SocialProofEmail(userId: string, email: string): Promise<boolean> {
  return sendLifecycle({
    userId,
    to: email,
    templateKey: EMAIL_TEMPLATE.DAY_7_SOCIAL_PROOF,
    subject: 'How freelancers ship faster with NiskBuild',
    html: T.day7SocialProofHtml(),
  });
}

export async function sendDay14NpsEmail(userId: string, email: string): Promise<boolean> {
  return sendLifecycle({
    userId,
    to: email,
    templateKey: EMAIL_TEMPLATE.DAY_14_NPS,
    subject: 'Quick question about NiskBuild (30 seconds)',
    html: T.day14NpsHtml(userId),
  });
}

export async function sendInactive14dEmail(userId: string, email: string): Promise<boolean> {
  return sendLifecycle({
    userId,
    to: email,
    templateKey: EMAIL_TEMPLATE.INACTIVE_14D,
    subject: 'We miss you at NiskBuild',
    html: T.inactive14dHtml(),
  });
}

/** Admin manual re-engagement — always sends (force), unique log row per send */
export async function sendManualReengagementEmail(
  userId: string,
  email: string
): Promise<LifecycleSendResult> {
  return sendLifecycleEmail({
    userId,
    to: email,
    templateKey: `${EMAIL_TEMPLATE.REENGAGEMENT_MANUAL}_${Date.now()}`,
    subject: 'We miss you at NiskBuild',
    html: T.reengagementManualHtml(),
    force: true,
    source: 'admin',
  });
}

export async function sendCancelWarningEmail(userId: string, email: string): Promise<boolean> {
  return sendLifecycle({
    userId,
    to: email,
    templateKey: EMAIL_TEMPLATE.CANCEL_WARNING,
    subject: 'Before you cancel — what you will lose',
    html: T.cancelWarningHtml(),
  });
}

export async function sendWinback7dEmail(userId: string, email: string): Promise<boolean> {
  return sendLifecycle({
    userId,
    to: email,
    templateKey: EMAIL_TEMPLATE.WINBACK_7D,
    subject: 'Your NiskBuild previews are still saved',
    html: T.winback7dHtml(),
  });
}

export async function sendWinback30dEmail(userId: string, email: string): Promise<boolean> {
  const promoCode = await createWinbackPromoCode(userId);
  const html = T.winback30dHtml(promoCode);
  const subject = promoCode
    ? 'Come back to NiskBuild — 20% off inside'
    : 'Come back to NiskBuild';

  return sendLifecycle({
    userId,
    to: email,
    templateKey: EMAIL_TEMPLATE.WINBACK_30D,
    subject,
    html,
    htmlSnapshot: html,
  });
}

export async function sendPaymentFailedEmail(userId: string, email: string): Promise<boolean> {
  return sendLifecycle({
    userId,
    to: email,
    templateKey: EMAIL_TEMPLATE.PAYMENT_FAILED,
    subject: 'Your NiskBuild payment failed',
    html: T.paymentFailedHtml(),
    force: true,
  });
}

export async function sendUpgradeConfirmedEmail(
  userId: string,
  email: string,
  tier: string
): Promise<boolean> {
  return sendLifecycle({
    userId,
    to: email,
    templateKey: `${EMAIL_TEMPLATE.UPGRADE_CONFIRMED}_${tier}`,
    subject: `Welcome to ${tierDisplayName(tier)}`,
    html: T.upgradeConfirmedHtml(tierDisplayName(tier)),
  });
}

export async function sendMonthlyReportEmail(
  userId: string,
  email: string,
  params: { builds: number; projects: number; creditsRemaining: number; monthLabel: string },
  templateKey: string
): Promise<boolean> {
  return sendLifecycle({
    userId,
    to: email,
    templateKey,
    subject: `Your NiskBuild month — ${params.monthLabel}`,
    html: T.monthlyReportHtml(params),
  });
}
