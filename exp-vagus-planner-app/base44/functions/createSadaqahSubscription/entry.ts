/**
 * createSadaqahSubscription
 * Creates a Stripe Checkout Session for a recurring Sadaqah subscription (daily or weekly).
 * Uses Stripe's price API with recurring intervals.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { amount_cents, charity_id, charity_name, interval, donor_name } = await req.json();

    if (!amount_cents || amount_cents < 100) {
      return Response.json({ error: 'Minimum donation is $1.00' }, { status: 422 });
    }
    if (!['day', 'week'].includes(interval)) {
      return Response.json({ error: 'Interval must be "day" or "week"' }, { status: 422 });
    }

    const origin = req.headers.get('origin') || 'https://app.vagusplanner.com';

    // Create an ad-hoc price for this donation amount + interval
    const price = await stripe.prices.create({
      currency: 'usd',
      unit_amount: amount_cents,
      recurring: { interval },
      product_data: {
        name: `Sadaqah — ${charity_name} (${interval === 'day' ? 'Daily' : 'Weekly'})`,
      },
    });

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: price.id, quantity: 1 }],
      customer_email: user.email,
      success_url: `${origin}/ZakatDonation?sadaqah_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/ZakatDonation?sadaqah_canceled=true`,
      subscription_data: {
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          charity_id,
          charity_name,
          donor_email: user.email,
          donor_name: donor_name || user.full_name || '',
          type: 'sadaqah',
          interval,
        },
      },
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        charity_id,
        charity_name,
        type: 'sadaqah',
        interval,
      },
    });

    console.log(`[createSadaqahSubscription] Session created: ${session.id} for ${user.email} → ${charity_name} $${amount_cents / 100}/${interval}`);
    return Response.json({ url: session.url, session_id: session.id });
  } catch (err) {
    console.error('[createSadaqahSubscription] Error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});