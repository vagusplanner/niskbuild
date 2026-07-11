import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { captureApiException } from '@/lib/api-error';
import {
  verifyResendWebhook,
  type ResendWebhookEvent,
} from '@/lib/email/verify-resend-webhook';

/**
 * Resend → Svix webhook.
 * Updates email_sends open/click timestamps for the admin email hub.
 * Bounce/complaint/delivered are acknowledged (2xx) so Resend keeps the endpoint
 * enabled; they do not currently suppress sends in-app.
 */
async function applyResendEvent(event: ResendWebhookEvent): Promise<void> {
  const emailId = event.data?.email_id;
  if (!emailId) return;

  const admin = createAdminClient();
  const now = new Date().toISOString();

  if (event.type === 'email.opened') {
    const { error } = await admin
      .from('email_sends')
      .update({ opened_at: now })
      .eq('resend_id', emailId)
      .is('opened_at', null);
    if (error) throw new Error(`email.opened update failed: ${error.message}`);
    return;
  }

  if (event.type === 'email.clicked') {
    const { error } = await admin
      .from('email_sends')
      .update({ clicked_at: now })
      .eq('resend_id', emailId)
      .is('clicked_at', null);
    if (error) throw new Error(`email.clicked update failed: ${error.message}`);
    return;
  }

  // email.bounced / email.complained / email.delivered / etc. — accept without error
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  let event: ResendWebhookEvent;
  try {
    event = verifyResendWebhook(rawBody, {
      svixId: request.headers.get('svix-id'),
      svixTimestamp: request.headers.get('svix-timestamp'),
      svixSignature: request.headers.get('svix-signature'),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid webhook';
    console.error('Resend webhook verify:', message);
    captureApiException(err);
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  try {
    await applyResendEvent(event);
    return NextResponse.json({ ok: true, type: event.type });
  } catch (err) {
    console.error('Resend webhook:', err);
    captureApiException(err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: 'resend-email-events',
    message: 'Resend webhook endpoint is active',
    preferredUrl: 'https://www.niskbuild.com/api/webhooks/resend',
  });
}
