import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabaseClient';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 });
  }

  // Handle checkout completion
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    
    if (userId) {
      // Update user to Pro in Supabase
      await supabase
        .from('profiles')
        .update({ subscription_tier: 'pro', updated_at: new Date().toISOString() })
        .eq('id', userId);
      
      console.log(`✅ User ${userId} upgraded to Pro`);
    }
  }

  // Handle subscription cancellation
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    const email = customer.email;
    
    if (email) {
      await supabase
        .from('profiles')
        .update({ subscription_tier: 'free' })
        .eq('email', email);
      
      console.log(`📉 User ${email} downgraded to Free`);
    }
  }

  return NextResponse.json({ received: true });
}