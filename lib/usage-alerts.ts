import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  canUseLocalOllama,
  getCloudCreditsForTier,
  getNextTier,
  tierDisplayName,
} from '@/lib/tier-config';
import { sendEmail } from '@/lib/send-email';

const ALERT_THRESHOLD = 0.8;

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://niskbuild.com';
}

function estimateDaysUntilEmpty(creditsUsed: number, creditsRemaining: number): number {
  const dayOfMonth = new Date().getDate();
  const dailyRate = creditsUsed / Math.max(dayOfMonth, 1);
  if (dailyRate <= 0) return creditsRemaining > 0 ? 30 : 0;
  return Math.max(1, Math.ceil(creditsRemaining / dailyRate));
}

export async function resetCreditAlertFlags(userId: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from('profiles')
    .update({
      credit_alert_80_sent: false,
      credit_alert_100_sent: false,
    })
    .eq('id', userId);
}

export async function maybeSendUsageAlert(
  userId: string,
  email: string | undefined,
  tier: string,
  creditsRemaining: number
): Promise<void> {
  const supabase = createAdminClient();

  let to = email;
  if (!to) {
    const { data } = await supabase.from('profiles').select('email').eq('id', userId).single();
    to = data?.email ?? undefined;
  }
  if (!to) return;

  const allowance = getCloudCreditsForTier(tier);
  if (allowance <= 0) return;

  const creditsUsed = allowance - creditsRemaining;
  const usagePct = (creditsUsed / allowance) * 100;

  const { data: profile } = await supabase
    .from('profiles')
    .select('credit_alert_80_sent, credit_alert_100_sent')
    .eq('id', userId)
    .single();

  const pricingUrl = `${appUrl()}/pricing`;
  const settingsUrl = `${appUrl()}/dashboard/settings?tab=billing`;

  if (creditsRemaining <= 0 && !profile?.credit_alert_100_sent) {
    await sendEmail({
      to,
      subject: 'You have run out of NiskBuild builds',
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:520px;color:#e2e8f0;background:#0B0F19;padding:32px;border-radius:12px;">
          <h2 style="color:#fff;margin:0 0 12px;">Your monthly builds are exhausted</h2>
          <p style="color:#94a3b8;line-height:1.6;">Your monthly builds are exhausted. Top up now to continue building — or upgrade for more builds every month.</p>
          <p style="margin:24px 0;">
            <a href="${settingsUrl}" style="display:inline-block;background:linear-gradient(135deg,#4F6EF7,#7C3AED);color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-right:8px;">Top up with a build pack</a>
            <a href="${pricingUrl}" style="display:inline-block;border:1px solid #4F6EF7;color:#4F6EF7;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Upgrade plan</a>
          </p>
        </div>
      `,
    });

    await supabase
      .from('profiles')
      .update({ credit_alert_100_sent: true })
      .eq('id', userId);
    return;
  }

  if (usagePct < ALERT_THRESHOLD * 100 || profile?.credit_alert_80_sent) return;

  const daysLeft = estimateDaysUntilEmpty(creditsUsed, creditsRemaining);
  const nextPlan = getNextTier(tier);
  const tierName = tierDisplayName(tier);
  const byocNote = canUseLocalOllama(tier)
    ? 'You already have BYOC Ollama on your plan — enable it in Builder for unlimited local builds.'
    : 'Enable BYOC Ollama for unlimited local builds (Agency+ only).';

  const upgradeBlock = nextPlan
    ? `<p style="color:#94a3b8;margin:12px 0;"><strong style="color:#fff;">(1) Upgrade to ${nextPlan.name}</strong> for ${nextPlan.credits.toLocaleString()} builds/month.</p>`
    : '';

  await sendEmail({
    to,
    subject: 'You have used 80% of your NiskBuild builds this month',
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:520px;color:#e2e8f0;background:#0B0F19;padding:32px;border-radius:12px;">
        <h2 style="color:#fff;margin:0 0 12px;">You have used 80% of your NiskBuild builds this month</h2>
        <p style="color:#94a3b8;line-height:1.6;">
          You have used <strong style="color:#22d3ee;">${creditsUsed}</strong> of your
          <strong style="color:#fff;">${allowance}</strong> monthly builds on ${tierName}.
          At this rate you will run out in <strong style="color:#fff;">${daysLeft}</strong> day${daysLeft === 1 ? '' : 's'}.
        </p>
        <div style="width:100%;background:#1e293b;border-radius:10px;height:8px;margin:20px 0;">
          <div style="width:${Math.min(Math.round(usagePct), 100)}%;background:#6366F1;height:8px;border-radius:10px;"></div>
        </div>
        <p style="color:#94a3b8;font-size:14px;">Options:</p>
        ${upgradeBlock}
        <p style="color:#94a3b8;margin:12px 0;"><strong style="color:#fff;">(2) Top up</strong> with a build pack — reload credits without changing plans.</p>
        <p style="color:#94a3b8;margin:12px 0;"><strong style="color:#fff;">(3)</strong> ${byocNote}</p>
        <p style="margin:24px 0;">
          <a href="${pricingUrl}" style="display:inline-block;background:linear-gradient(135deg,#4F6EF7,#7C3AED);color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-right:8px;">View plans</a>
          <a href="${settingsUrl}" style="display:inline-block;border:1px solid #22d3ee;color:#22d3ee;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Reload packs</a>
        </p>
      </div>
    `,
  });

  await supabase
    .from('profiles')
    .update({ credit_alert_80_sent: true })
    .eq('id', userId);
}
