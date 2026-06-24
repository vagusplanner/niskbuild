import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), { apiVersion: '2023-10-16' });

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { amount, charity_id, charity_name, donation_type, donor_email, donor_name } = await req.json();

    if (!amount || amount < 100) {
      return Response.json({ error: 'Minimum donation is $1.00' }, { status: 400 });
    }
    if (!charity_id) {
      return Response.json({ error: 'Charity is required' }, { status: 400 });
    }

    const appUrl = req.headers.get('origin') || 'https://app.vagusplanner.com';
    const isRecurring = donation_type === 'monthly';

    let sessionParams = {
      mode: isRecurring ? 'subscription' : 'payment',
      customer_email: donor_email || user.email,
      success_url: `${appUrl}/ZakatDonation?success=true`,
      cancel_url: `${appUrl}/ZakatDonation?canceled=true`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        charity_id,
        charity_name,
        donation_type,
        donor_email: donor_email || user.email,
        donor_name: donor_name || user.full_name || '',
      },
      payment_intent_data: isRecurring ? undefined : {
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          charity_id,
          charity_name,
          donation_type,
        }
      },
    };

    if (isRecurring) {
      // Create a recurring price on the fly
      const price = await stripe.prices.create({
        currency: 'usd',
        unit_amount: amount,
        recurring: { interval: 'month' },
        product_data: { name: `Monthly Donation — ${charity_name}` },
      });
      sessionParams.line_items = [{ price: price.id, quantity: 1 }];
    } else {
      sessionParams.line_items = [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: amount,
          product_data: {
            name: `Donation — ${charity_name}`,
            description: `${donation_type === 'zakat' ? 'Zakat' : 'Sadaqah'} donation via Vagus Planner`,
            images: [],
          },
        },
      }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(`[ZakatDonation] Session created: ${session.id} | ${charity_name} | $${amount / 100} | ${donation_type}`);

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('[ZakatDonation] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});