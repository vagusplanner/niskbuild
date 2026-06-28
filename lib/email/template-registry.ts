import 'server-only';

import { EMAIL_TEMPLATE } from '@/lib/email/constants';
import { tierDisplayName } from '@/lib/tier-config';
import * as T from '@/lib/email/templates';

export type EmailTemplateCatalogEntry = {
  key: string;
  label: string;
  subject: string;
  description: string;
  category: 'onboarding' | 'retention' | 'billing' | 'winback' | 'report';
};

export const EMAIL_TEMPLATE_CATALOG: EmailTemplateCatalogEntry[] = [
  {
    key: EMAIL_TEMPLATE.WELCOME,
    label: 'Welcome',
    subject: 'Welcome to NiskBuild',
    description: 'Sent on signup after email confirmation.',
    category: 'onboarding',
  },
  {
    key: EMAIL_TEMPLATE.DAY_1_NO_BUILD,
    label: 'Day 1 — no build yet',
    subject: 'Ready to build your first app?',
    description: 'Nudge for new users with zero builds after ~24 hours.',
    category: 'onboarding',
  },
  {
    key: EMAIL_TEMPLATE.DAY_3_FEATURE_TIP,
    label: 'Day 3 — feature tip',
    subject: 'Try the Game Builder on NiskBuild',
    description: 'Highlights game templates for active new users.',
    category: 'onboarding',
  },
  {
    key: EMAIL_TEMPLATE.DAY_7_SOCIAL_PROOF,
    label: 'Day 7 — social proof',
    subject: 'How freelancers ship faster with NiskBuild',
    description: 'Social proof for users who built in the first week.',
    category: 'onboarding',
  },
  {
    key: EMAIL_TEMPLATE.DAY_14_NPS,
    label: 'Day 14 — NPS survey',
    subject: 'How likely are you to recommend NiskBuild?',
    description: 'Links to /nps for satisfaction score.',
    category: 'onboarding',
  },
  {
    key: EMAIL_TEMPLATE.CREDIT_80,
    label: '80% credits used',
    subject: 'You have used 80% of your NiskBuild builds this month',
    description: 'Triggered when paid user crosses 80% monthly credits.',
    category: 'billing',
  },
  {
    key: EMAIL_TEMPLATE.CREDIT_0,
    label: 'Credits exhausted',
    subject: 'You have run out of NiskBuild builds',
    description: 'Triggered when monthly credits hit zero.',
    category: 'billing',
  },
  {
    key: EMAIL_TEMPLATE.INACTIVE_14D,
    label: '14-day inactive',
    subject: 'We miss you at NiskBuild',
    description: 'Paid users with no builds in 14 days.',
    category: 'retention',
  },
  {
    key: EMAIL_TEMPLATE.REENGAGEMENT_MANUAL,
    label: 'Manual re-engagement',
    subject: 'We miss you at NiskBuild',
    description: 'Admin-triggered from Churn risk or Email hub.',
    category: 'retention',
  },
  {
    key: EMAIL_TEMPLATE.CANCEL_WARNING,
    label: 'Cancel warning',
    subject: 'Before you cancel — what you will lose',
    description: 'Sent when user sets cancel_at_period_end in Stripe.',
    category: 'billing',
  },
  {
    key: EMAIL_TEMPLATE.WINBACK_7D,
    label: 'Win-back 7 days',
    subject: 'Your NiskBuild previews are still saved',
    description: '7 days after subscription ended.',
    category: 'winback',
  },
  {
    key: EMAIL_TEMPLATE.WINBACK_30D,
    label: 'Win-back 30 days',
    subject: 'Come back to NiskBuild — 20% off',
    description: '30 days after cancel; includes Stripe promo code when configured.',
    category: 'winback',
  },
  {
    key: EMAIL_TEMPLATE.PAYMENT_FAILED,
    label: 'Payment failed',
    subject: 'Your NiskBuild payment failed',
    description: 'Stripe invoice.payment_failed webhook.',
    category: 'billing',
  },
  {
    key: EMAIL_TEMPLATE.UPGRADE_CONFIRMED,
    label: 'Upgrade confirmed',
    subject: 'Welcome to your new plan',
    description: 'Sent after successful subscription checkout.',
    category: 'billing',
  },
];

const SAMPLE_CREDIT = {
  creditsUsed: 800,
  allowance: 1000,
  tierName: tierDisplayName('pro'),
  daysLeft: 6,
  upgradeBlock:
    '<p style="color:#94a3b8;margin:12px 0;"><strong style="color:#fff;">(1) Upgrade to Agency Studio</strong> for more builds/month.</p>',
  byocNote: 'Enable BYOC Ollama for unlimited local builds (Pro Worker and above).',
};

export function renderTemplateHtml(
  templateKey: string,
  options?: { promoCode?: string; tier?: string }
): { subject: string; html: string } | null {
  const entry = EMAIL_TEMPLATE_CATALOG.find((t) => t.key === templateKey);
  if (!entry && !templateKey.startsWith(`${EMAIL_TEMPLATE.UPGRADE_CONFIRMED}_`)) {
    return null;
  }

  switch (templateKey) {
    case EMAIL_TEMPLATE.WELCOME:
      return { subject: entry!.subject, html: T.welcomeEmailHtml() };
    case EMAIL_TEMPLATE.DAY_1_NO_BUILD:
      return { subject: entry!.subject, html: T.day1NoBuildHtml() };
    case EMAIL_TEMPLATE.DAY_3_FEATURE_TIP:
      return { subject: entry!.subject, html: T.day3FeatureTipHtml() };
    case EMAIL_TEMPLATE.DAY_7_SOCIAL_PROOF:
      return { subject: entry!.subject, html: T.day7SocialProofHtml() };
    case EMAIL_TEMPLATE.DAY_14_NPS:
      return { subject: entry!.subject, html: T.day14NpsHtml() };
    case EMAIL_TEMPLATE.CREDIT_80:
      return { subject: entry!.subject, html: T.credit80Html(SAMPLE_CREDIT) };
    case EMAIL_TEMPLATE.CREDIT_0:
      return { subject: entry!.subject, html: T.credit0Html() };
    case EMAIL_TEMPLATE.INACTIVE_14D:
      return { subject: entry!.subject, html: T.inactive14dHtml() };
    case EMAIL_TEMPLATE.REENGAGEMENT_MANUAL:
      return { subject: entry!.subject, html: T.reengagementManualHtml() };
    case EMAIL_TEMPLATE.CANCEL_WARNING:
      return { subject: entry!.subject, html: T.cancelWarningHtml() };
    case EMAIL_TEMPLATE.WINBACK_7D:
      return { subject: entry!.subject, html: T.winback7dHtml() };
    case EMAIL_TEMPLATE.WINBACK_30D:
      return {
        subject: entry!.subject,
        html: T.winback30dHtml(options?.promoCode),
      };
    case EMAIL_TEMPLATE.PAYMENT_FAILED:
      return { subject: entry!.subject, html: T.paymentFailedHtml() };
    default:
      if (templateKey.startsWith(`${EMAIL_TEMPLATE.UPGRADE_CONFIRMED}_`)) {
        const tier = options?.tier ?? templateKey.split('_').pop() ?? 'pro';
        return {
          subject: `Welcome to ${tierDisplayName(tier)}`,
          html: T.upgradeConfirmedHtml(tierDisplayName(tier)),
        };
      }
      if (templateKey.startsWith('monthly_report_')) {
        const now = new Date();
        const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });
        return {
          subject: `Your NiskBuild month — ${monthLabel}`,
          html: T.monthlyReportHtml({
            builds: 12,
            projects: 3,
            creditsRemaining: 450,
            monthLabel,
          }),
        };
      }
      return null;
  }
}

export function catalogEntryForKey(key: string): EmailTemplateCatalogEntry | undefined {
  if (EMAIL_TEMPLATE_CATALOG.some((e) => e.key === key)) {
    return EMAIL_TEMPLATE_CATALOG.find((e) => e.key === key);
  }
  if (key.startsWith(`${EMAIL_TEMPLATE.UPGRADE_CONFIRMED}_`)) {
    return {
      key,
      label: 'Upgrade confirmed',
      subject: 'Welcome to your new plan',
      description: 'Post-checkout upgrade confirmation.',
      category: 'billing',
    };
  }
  if (key.startsWith('monthly_report_')) {
    return {
      key,
      label: 'Monthly report',
      subject: 'Your NiskBuild month in numbers',
      description: 'Sent on the 1st of each month to paid users.',
      category: 'report',
    };
  }
  return undefined;
}
