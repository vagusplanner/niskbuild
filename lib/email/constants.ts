/** Resend lifecycle template keys — one send per user unless noted. */
export const EMAIL_TEMPLATE = {
  WELCOME: 'welcome',
  DAY_1_NO_BUILD: 'day_1_no_build',
  DAY_3_FEATURE_TIP: 'day_3_feature_tip',
  DAY_7_SOCIAL_PROOF: 'day_7_social_proof',
  DAY_14_NPS: 'day_14_nps',
  CREDIT_80: 'credit_80',
  CREDIT_0: 'credit_0',
  INACTIVE_14D: 'inactive_14d',
  REENGAGEMENT_MANUAL: 'reengagement_manual',
  CANCEL_WARNING: 'cancel_warning',
  WINBACK_7D: 'winback_7d',
  WINBACK_30D: 'winback_30d',
  PAYMENT_FAILED: 'payment_failed',
  UPGRADE_CONFIRMED: 'upgrade_confirmed',
} as const;

export type EmailTemplateKey = (typeof EMAIL_TEMPLATE)[keyof typeof EMAIL_TEMPLATE];

export function monthlyReportKey(year: number, month: number): string {
  const mm = String(month).padStart(2, '0');
  return `monthly_report_${year}_${mm}`;
}

export const CHURN_INACTIVE_DAYS = 14;
