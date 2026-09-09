import { NextRequest } from 'next/server';
import { captureApiException } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveEffectivePlanForUser } from '@/lib/vp-plan-access';
import { loadUserPlanContext } from '@/lib/vp-usage-meter';
import { isPlatformOwner } from '@/lib/platform-owner-auth';
import { toVpPlanId } from '@/lib/vp-stripe-billing-sync';
import {
  vpApiCorsPreflightResponse,
  vpApiJson,
  withVpApiCors,
} from '@/lib/vp-api-cors';

export async function OPTIONS(request: NextRequest) {
  return vpApiCorsPreflightResponse(request);
}

function normalizeInvoiceForUi(row: Record<string, unknown>) {
  const meta =
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};
  const refundAmount =
    typeof row.refund_amount === 'number'
      ? row.refund_amount
      : typeof meta.refund_amount === 'number'
        ? meta.refund_amount
        : null;
  return {
    ...row,
    amount: typeof row.amount === 'number' ? row.amount : Number(row.amount) || 0,
    pdf_url:
      (typeof meta.pdf_url === 'string' && meta.pdf_url) ||
      (typeof meta.hosted_invoice_url === 'string' && meta.hosted_invoice_url) ||
      null,
    refund_applied:
      meta.refund_applied === true || (typeof refundAmount === 'number' && refundAmount > 0),
    refund_amount: refundAmount,
  };
}

/**
 * Billing snapshot for Vagus Planner Account/Billing UI.
 * Plan resolution matches GET /api/vagus-planner/plan-access exactly
 * (vp_subscriptions preferred, profiles fallback) so display cannot drift from gating.
 */
export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return withVpApiCors(request, guard.response);

  try {
    const admin = createAdminClient();
    const userId = guard.user!.id;
    const platformOwnerBypass = await isPlatformOwner(userId);
    const { subscriptions: planSubs, profile } = await loadUserPlanContext(admin, userId);
    const planInfo = await resolveEffectivePlanForUser(userId, {
      subscriptions: planSubs,
      profile,
    });

    const [{ data: subRows }, { data: invoiceRows }, { data: profileBilling }] =
      await Promise.all([
        admin
          .schema('firstparty')
          .from('vp_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5),
        admin
          .schema('firstparty')
          .from('vp_invoices')
          .select('*')
          .eq('user_id', userId)
          .order('issued_date', { ascending: false })
          .limit(50),
        admin
          .from('profiles')
          .select(
            'subscription_tier, subscription_status, subscription_id, stripe_customer_id, email'
          )
          .eq('id', userId)
          .maybeSingle(),
      ]);

    const displayPlan = toVpPlanId(planInfo.plan) || 'free';
    const displayStatus =
      (typeof planInfo.status === 'string' && planInfo.status) ||
      (planInfo.isPaid ? 'active' : 'active');

    const matchingSub =
      (subRows || []).find((s) => {
        const plan = toVpPlanId(s.plan);
        const status = typeof s.status === 'string' ? s.status.toLowerCase() : '';
        return (
          plan === displayPlan &&
          (status === 'active' ||
            status === 'trialing' ||
            status === 'past_due' ||
            (displayStatus && status === displayStatus.toLowerCase()))
        );
      }) ||
      (subRows || []).find((s) => {
        const status = typeof s.status === 'string' ? s.status.toLowerCase() : '';
        return status === 'active' || status === 'trialing' || status === 'past_due';
      }) ||
      (subRows || [])[0] ||
      null;

    const stripeSubscriptionId =
      (typeof matchingSub?.stripe_subscription_id === 'string' &&
        matchingSub.stripe_subscription_id) ||
      (typeof profileBilling?.subscription_id === 'string' && profileBilling.subscription_id) ||
      null;

    const subscription =
      matchingSub != null
        ? {
            ...matchingSub,
            plan: displayPlan,
            status:
              displayStatus === 'inactive' && displayPlan === 'free'
                ? 'canceled'
                : matchingSub.status || displayStatus,
            user_email:
              matchingSub.user_email ||
              profileBilling?.email ||
              guard.user!.email ||
              '',
            stripe_subscription_id: stripeSubscriptionId,
          }
        : {
            plan: displayPlan,
            status: displayPlan === 'free' ? 'active' : displayStatus || 'active',
            user_email: profileBilling?.email || guard.user!.email || '',
            stripe_subscription_id: stripeSubscriptionId,
            stripe_customer_id: profileBilling?.stripe_customer_id ?? null,
            current_period_end: null,
            current_period_start: null,
            price_per_month: null,
            payment_method_id: null,
            auto_renew: displayPlan !== 'free',
          };

    const invoices = (invoiceRows || []).map((row) =>
      normalizeInvoiceForUi(row as Record<string, unknown>)
    );

    return vpApiJson(request, {
      plan: displayPlan,
      status: subscription.status,
      source: planInfo.source,
      isPaid: planInfo.isPaid === true || platformOwnerBypass,
      hasPaidIslamicAccess:
        planInfo.hasPaidIslamicAccess === true || platformOwnerBypass,
      platformOwnerBypass,
      subscription,
      invoices,
    });
  } catch (error) {
    captureApiException(error);
    return vpApiJson(
      request,
      {
        error: 'Failed to load billing status',
        plan: 'free',
        isPaid: false,
        subscription: { plan: 'free', status: 'active' },
        invoices: [],
      },
      { status: 500 }
    );
  }
}
