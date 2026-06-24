import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.0.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscriptionId, reason } = await req.json();

    if (!subscriptionId) {
      return Response.json({ error: 'Missing subscriptionId' }, { status: 400 });
    }

    // Cancel subscription in Stripe
    const canceledSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
      metadata: {
        cancellation_reason: reason || 'User requested'
      }
    });

    // Update subscription record
    const subscriptions = await base44.entities.Subscription.filter({}, '', 1);
    if (subscriptions[0]) {
      await base44.entities.Subscription.update(subscriptions[0].id, {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason
      });
    }

    return Response.json({
      success: true,
      canceledAt: canceledSubscription.canceled_at
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});