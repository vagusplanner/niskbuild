import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if running in preview/iframe
    const origin = req.headers.get('origin') || '';
    const isPreview = origin.includes('base44.app') || origin.includes('localhost');
    
    if (isPreview) {
      return Response.json({ 
        isPreview: true,
        error: 'Customer Portal only available in published apps' 
      });
    }

    // Get user's subscription to find their Stripe customer ID
    const subscriptions = await base44.entities.Subscription.filter({ user_email: user.email });
    
    if (!subscriptions || subscriptions.length === 0) {
      return Response.json({ 
        error: 'No subscription found. Please subscribe to a plan first.' 
      }, { status: 404 });
    }

    const subscription = subscriptions[0];
    
    if (!subscription.stripe_customer_id) {
      return Response.json({ 
        error: 'No Stripe customer found. Please contact support.' 
      }, { status: 404 });
    }

    // Create customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${req.headers.get('origin')}/Billing`,
    });

    console.log('Customer portal session created:', {
      customer: subscription.stripe_customer_id,
      session_id: session.id
    });

    return Response.json({ 
      portalUrl: session.url 
    });

  } catch (error) {
    console.error('Customer portal error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return Response.json({ 
      error: error.message || 'Failed to create customer portal session' 
    }, { status: 500 });
  }
});