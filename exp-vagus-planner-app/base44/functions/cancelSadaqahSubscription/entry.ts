/**
 * cancelSadaqahSubscription
 * Cancels a Stripe subscription by subscription_id, verifying ownership via email.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { subscription_id, record_id } = await req.json();
    if (!subscription_id) return Response.json({ error: 'subscription_id required' }, { status: 422 });

    // Verify subscription belongs to this user
    const sub = await stripe.subscriptions.retrieve(subscription_id);
    const customer = await stripe.customers.retrieve(sub.customer);
    if (customer.email !== user.email) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Cancel at period end (graceful)
    await stripe.subscriptions.update(subscription_id, { cancel_at_period_end: true });

    // Update local record
    if (record_id) {
      await base44.asServiceRole.entities.CharityDonation.update(record_id, { status: 'cancelling' });
    }

    console.log(`[cancelSadaqahSubscription] Subscription ${subscription_id} cancelled for ${user.email}`);
    return Response.json({ success: true });
  } catch (err) {
    console.error('[cancelSadaqahSubscription] Error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});