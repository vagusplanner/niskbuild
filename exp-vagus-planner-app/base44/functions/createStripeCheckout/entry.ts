import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');

if (!stripeKey) {
  console.error('STRIPE_SECRET_KEY not found in environment variables');
}

const stripe = new Stripe(stripeKey, {
  apiVersion: '2024-11-20.acacia'
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      console.error('No authenticated user found');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { priceId, planName } = body;
    
    console.log('Request body:', body);

    if (!priceId) {
      console.error('Missing priceId in request');
      return Response.json({ error: 'Price ID is required' }, { status: 400 });
    }
    
    if (!stripeKey) {
      console.error('Stripe key not configured');
      return Response.json({ error: 'Stripe is not configured' }, { status: 500 });
    }

    // Check if running in iframe (preview mode) - Allow for testing
    const origin = req.headers.get('origin') || '';
    const referer = req.headers.get('referer') || '';
    const host = req.headers.get('host') || '';
    const isPreview = referer.includes('/preview/') || host.includes('preview--');

    console.log('Environment check:', { origin, referer, host, isPreview });

    // Get the actual domain from the request
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    
    console.log('Creating checkout session:', {
      priceId,
      planName,
      user: user.email,
      baseUrl,
      origin
    });

    // Create Stripe checkout session
    console.log('Creating Stripe session with:', {
      mode: 'subscription',
      priceId,
      customer_email: user.email,
      success_url: `${baseUrl}/Billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/Billing?canceled=true`
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/Billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/Billing?canceled=true`,
      customer_email: user.email,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID') || 'unknown',
        user_email: user.email,
        plan_name: planName || 'subscription'
      },
      subscription_data: {
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID') || 'unknown',
          user_email: user.email,
        },
      },
    });

    console.log('Checkout session created:', {
      sessionId: session.id,
      url: session.url
    });

    return Response.json({ 
      sessionUrl: session.url,
      sessionId: session.id 
    });

  } catch (error) {
    console.error('Stripe checkout error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return Response.json({ 
      error: error.message || 'Failed to create checkout session' 
    }, { status: 500 });
  }
});