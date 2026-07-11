import 'server-only';

import { Webhook } from 'svix';

export type ResendWebhookEvent = {
  type: string;
  data?: {
    email_id?: string;
    created_at?: string;
  };
};

export function verifyResendWebhook(
  rawBody: string,
  headers: {
    svixId: string | null;
    svixTimestamp: string | null;
    svixSignature: string | null;
  }
): ResendWebhookEvent {
  // Trim + strip wrapping quotes — Vercel env UI sometimes preserves them and
  // Svix verification then fails on every delivery (Resend disables the endpoint).
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim().replace(/^["']|["']$/g, '');
  if (!secret) {
    // Dev / unconfigured: accept payload without signature (never leave empty in prod).
    return JSON.parse(rawBody) as ResendWebhookEvent;
  }

  const { svixId, svixTimestamp, svixSignature } = headers;
  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new Error('Missing Svix webhook headers');
  }

  const wh = new Webhook(secret);
  return wh.verify(rawBody, {
    'svix-id': svixId,
    'svix-timestamp': svixTimestamp,
    'svix-signature': svixSignature,
  }) as ResendWebhookEvent;
}
