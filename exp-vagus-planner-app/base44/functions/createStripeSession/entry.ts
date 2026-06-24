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

    const { planId, priceId } = await req.json();

    if (!planId || !priceId) {
      return Response.json({ error: 'Missing planId or priceId' }, { status: 400 });
    }

    // Get or create Stripe customer
    let subscriptions = await base44.entities.Subscription.filter({ stripe_customer_id: { $exists: true } }, '', 1);
    let customerId = subscriptions[0]?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
          appName: 'Vagus Planner'
        }
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${Deno.env.get('APP_URL')}/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${Deno.env.get('APP_URL')}/billing`,
      metadata: {
        userId: user.id,
        planId: planId
      }
    });

    return Response.json({ sessionUrl: session.url });
  } catch (error) {
    console.error('Stripe session error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});