import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabaseClient';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      event = JSON.parse(body);
    }
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 });
  }

  // Handle checkout completion
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const customerEmail = session.customer_email;
    const tier = session.metadata?.tier || 'pro';
    
    if (userId) {
      await supabase
        .from('profiles')
        .update({ 
          subscription_tier: tier, 
          subscription_status: 'active',
          subscription_id: session.subscription
        })
        .eq('id', userId);
      
      console.log(`✅ User ${userId} upgraded to ${tier}`);
    } else if (customerEmail) {
      await supabase
        .from('profiles')
        .update({ 
          subscription_tier: tier, 
          subscription_status: 'active'
        })
        .eq('email', customerEmail);
      
      console.log(`✅ User ${customerEmail} upgraded to ${tier}`);
    }
  }

  // Handle subscription cancellation
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const customerId = subscription.customer as string;
    
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer.deleted && customer.email) {
        await supabase
          .from('profiles')
          .update({ subscription_tier: 'free', subscription_status: 'inactive' })
          .eq('email', customer.email);
        
        console.log(`📉 User ${customer.email} downgraded to Free`);
      }
    } catch (err) {
      console.error('Error processing cancellation:', err);
    }
  }

  return NextResponse.json({ received: true });
}