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
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) {
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
