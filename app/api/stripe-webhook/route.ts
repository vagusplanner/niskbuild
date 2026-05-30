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
      const { error } = await supabase
        .from('profiles')
        .update({ subscription_tier: 'pro', updated_at: new Date().toISOString() })
        .eq('id', userId);
      
      if (error) {
        console.error('Failed to update user to pro:', error);
      } else {
        console.log(`✅ User ${userId} upgraded to Pro`);
      }
    }
  }

  // Handle subscription cancellation
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const customerId = subscription.customer as string;
    
    try {
      // Retrieve customer - check if it still exists
      const customer = await stripe.customers.retrieve(customerId);
      
      // Only proceed if customer is not deleted (has email)
      if (!customer.deleted && customer.email) {
        const { error } = await supabase
          .from('profiles')
          .update({ subscription_tier: 'free' })
          .eq('email', customer.email);
        
        if (error) {
          console.error('Failed to downgrade user:', error);
        } else {
          console.log(`📉 User ${customer.email} downgraded to Free`);
        }
      } else {
        console.log(`⚠️ Customer ${customerId} was deleted, skipping downgrade`);
      }
    } catch (err) {
      console.error('Error processing customer:', err);
    }
  }

  return NextResponse.json({ received: true });
}