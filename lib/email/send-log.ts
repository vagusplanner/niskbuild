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

/** Send once per user+template; returns false if already sent or send failed. */
export async function sendLifecycleEmail(params: {
  userId: string;
  to: string;
  templateKey: EmailTemplateKey | string;
  subject: string;
  html: string;
  force?: boolean;
  source?: 'system' | 'admin' | 'cron';
  htmlSnapshot?: string;
}): Promise<boolean> {
  if (!params.force) {
    const sent = await hasEmailBeenSent(params.userId, params.templateKey);
    if (sent) return false;
  }

  const result = await sendEmail({
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (!result.ok) return false;

  const admin = createAdminClient();
  const { error } = await admin.from('email_sends').insert({
    user_id: params.userId,
    template_key: params.templateKey,
    subject: params.subject,
    resend_id: result.id ?? null,
    source: params.source ?? 'system',
    html_snapshot: params.htmlSnapshot ?? params.html,
    sent_at: new Date().toISOString(),
  });

  if (error) {
    console.error('email_sends log:', error.message);
  }

  return true;
}
