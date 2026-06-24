import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.0.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const PLAN_FEATURES = {
  free: ['events_created', 'ai_requests_50', 'storage_1gb', 'integrations_2'],
  basic: ['events_created', 'ai_requests_500', 'storage_10gb', 'team_members_2', 'integrations_5', 'priority_support'],
  pro: ['events_created', 'ai_requests_2000', 'storage_100gb', 'team_members_10', 'integrations_all', 'priority_support', 'advanced_analytics'],
  premium: ['events_created', 'ai_requests_unlimited', 'storage_unlimited', 'team_members_unlimited', 'integrations_all', 'priority_support', 'advanced_analytics', 'custom_branding']
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscriptionId } = await req.json();

    if (!subscriptionId) {
      return Response.json({ error: 'Missing subscriptionId' }, { status: 400 });
    }

    // Fetch subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const product = await stripe.products.retrieve(subscription.items.data[0].price.product);
    
    const planId = product.metadata.planId || 'free';
    const price = subscription.items.data[0].price.unit_amount / 100;

    // Get or create subscription record
    const subscriptions = await base44.entities.Subscription.filter({}, '', 1);
    const subscriptionData = {
      stripe_customer_id: subscription.customer,
      stripe_subscription_id: subscription.id,
      plan: planId,
      status: subscription.status,
      billing_cycle: subscription.items.data[0].price.recurring.interval === 'month' ? 'monthly' : 'annual',
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      price_per_month: price,
      auto_renew: !subscription.cancel_at_period_end,
      features: PLAN_FEATURES[planId] || PLAN_FEATURES.free
    };

    if (subscriptions[0]) {
      await base44.entities.Subscription.update(subscriptions[0].id, subscriptionData);
    } else {
      await base44.entities.Subscription.create(subscriptionData);
    }

    return Response.json({ success: true, plan: planId });
  } catch (error) {
    console.error('Sync subscription error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});