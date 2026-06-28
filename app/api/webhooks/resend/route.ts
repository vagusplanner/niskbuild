import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  verifyResendWebhook,
  type ResendWebhookEvent,
} from '@/lib/email/verify-resend-webhook';

async function applyResendEvent(event: ResendWebhookEvent): Promise<void> {
  const emailId = event.data?.email_id;
  if (!emailId) return;

  const admin = createAdminClient();
  const now = new Date().toISOString();

  if (event.type === 'email.opened') {
    await admin
      .from('email_sends')
      .update({ opened_at: now })
      .eq('resend_id', emailId)
      .is('opened_at', null);
  }

  if (event.type === 'email.clicked') {
    await admin
      .from('email_sends')
      .update({ clicked_at: now })
      .eq('resend_id', emailId)
      .is('clicked_at', null);
  }
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
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  try {
    await applyResendEvent(event);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Resend webhook:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: 'resend-email-events',
    message: 'Resend webhook endpoint is active',
  });
}
