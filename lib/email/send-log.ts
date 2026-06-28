import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/send-email';
import type { EmailTemplateKey } from '@/lib/email/constants';

export async function hasEmailBeenSent(
  userId: string,
  templateKey: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('email_sends')
    .select('id')
    .eq('user_id', userId)
    .eq('template_key', templateKey)
    .maybeSingle();

  return !!data;
}

export type LifecycleSendResult = { ok: boolean; error?: string; logWarning?: string };

/** Send once per user+template unless force=true. */
export async function sendLifecycleEmail(params: {
  userId: string;
  to: string;
  templateKey: EmailTemplateKey | string;
  subject: string;
  html: string;
  force?: boolean;
  source?: 'system' | 'admin' | 'cron';
  htmlSnapshot?: string;
}): Promise<LifecycleSendResult> {
  if (!params.force) {
    const sent = await hasEmailBeenSent(params.userId, params.templateKey);
    if (sent) {
      return { ok: false, error: 'This lifecycle email was already sent to this user.' };
    }
  }

  const result = await sendEmail({
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (!result.ok) {
    return {
      ok: false,
      error:
        result.error ??
        'Resend rejected the email. Check RESEND_API_KEY and that EMAIL_FROM uses a verified domain.',
    };
  }

  const admin = createAdminClient();
  const row: Record<string, unknown> = {
    user_id: params.userId,
    template_key: params.templateKey,
    sent_at: new Date().toISOString(),
  };

  // Optional columns from admin-email-hub-migration.sql (#30)
  row.subject = params.subject;
  row.resend_id = result.id ?? null;
  row.source = params.source ?? 'system';
  row.html_snapshot = params.htmlSnapshot ?? params.html;

  const { error } = await admin.from('email_sends').insert(row);

  if (error) {
    // Fallback if admin-email-hub-migration.sql (#30) not applied yet
    const { error: fallbackError } = await admin.from('email_sends').insert({
      user_id: params.userId,
      template_key: params.templateKey,
      sent_at: new Date().toISOString(),
    });

    if (fallbackError) {
      console.error('email_sends log:', error.message, fallbackError.message);
      return {
        ok: true,
        logWarning: `Email sent but log failed. Run retention-email-churn (#29) and admin-email-hub (#30) migrations.`,
      };
    }
  }

  return { ok: true };
}
