/**
 * RevenueCat → Vagus Planner Apple IAP webhook.
 *
 * Dashboard: set Authorization header to the same value as env REVENUECAT_WEBHOOK_SECRET
 * (e.g. `Bearer <secret>` or raw secret — both accepted).
 *
 * URL: POST /api/webhooks/revenuecat
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  upsertVpSubscriptionFromRevenueCat,
  type RevenueCatWebhookEvent,
} from '@/lib/vp-apple-billing-sync';

export const runtime = 'nodejs';

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

/** Accept `Bearer <secret>`, `Authorization: <secret>`, or raw secret match. */
export function verifyRevenueCatWebhookAuth(
  authorizationHeader: string | null,
  secret: string
): boolean {
  if (!secret || !authorizationHeader) return false;
  const header = authorizationHeader.trim();
  const bearer = header.toLowerCase().startsWith('bearer ')
    ? header.slice(7).trim()
    : header;
  return (
    timingSafeEqualString(header, secret) ||
    timingSafeEqualString(bearer, secret) ||
    timingSafeEqualString(header, `Bearer ${secret}`)
  );
}

export async function POST(request: NextRequest) {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET?.trim() || '';
  if (!secret) {
    console.error('[revenuecat-webhook] REVENUECAT_WEBHOOK_SECRET is not configured');
    return NextResponse.json(
      { error: 'REVENUECAT_WEBHOOK_SECRET is not configured' },
      { status: 500 }
    );
  }

  const auth = request.headers.get('authorization');
  if (!verifyRevenueCatWebhookAuth(auth, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { api_version?: string; event?: RevenueCatWebhookEvent };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const event = body?.event;
  if (!event || typeof event !== 'object') {
    return NextResponse.json({ error: 'Missing event' }, { status: 400 });
  }

  const type = typeof event.type === 'string' ? event.type.toUpperCase() : '';
  if (type === 'TEST') {
    return NextResponse.json({ ok: true, handled: 'TEST' });
  }

  try {
    const admin = createAdminClient();
    const result = await upsertVpSubscriptionFromRevenueCat(admin, event);
    return NextResponse.json({
      ok: true,
      type,
      handled: Boolean(result),
      subscriptionId: result?.id ?? null,
      plan: result?.plan ?? null,
      status: result?.status ?? null,
      skipped: result?.skipped === true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook processing failed';
    console.error('[revenuecat-webhook] failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
