import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

/**
 * Automated billing operations handler
 * Handles payment retries, grace periods, and automated notifications
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { action, subscriptionId, data } = await req.json();

    switch (action) {
      case 'retry_payment': {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const latestInvoice = await stripe.invoices.retrieve(subscription.latest_invoice);
        
        if (latestInvoice.status === 'open') {
          await stripe.invoices.pay(latestInvoice.id);
          
          // Update subscription status
          const subs = await base44.asServiceRole.entities.Subscription.filter({
            stripe_subscription_id: subscriptionId
          });
          if (subs.length > 0) {
            await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
              status: 'active',
              payment_retry_count: (subs[0].payment_retry_count || 0) + 1
            });
          }
        }
        
        return Response.json({ success: true, status: latestInvoice.status });
      }

      case 'apply_grace_period': {
        const subs = await base44.asServiceRole.entities.Subscription.filter({
          stripe_subscription_id: subscriptionId
        });
        
        if (subs.length > 0) {
          const gracePeriodEnd = new Date();
          gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7); // 7 days grace
          
          await base44.asServiceRole.entities.Subscription.update(subs[0].id, {
            grace_period_end: gracePeriodEnd.toISOString(),
            status: 'grace_period'
          });
          
          // Send grace period notification
          await base44.asServiceRole.functions.invoke('sendBillingEmail', {
            emailType: 'grace_period',
            userEmail: subs[0].user_email,
            data: {
              planName: subs[0].plan,
              gracePeriodEnd: gracePeriodEnd.toISOString()
            }
          });
        }
        
        return Response.json({ success: true });
      }

      case 'check_usage_limits': {
        const { userEmail, featureType } = data;
        
        // Get user's subscription
        const subs = await base44.asServiceRole.entities.Subscription.filter({
          user_email: userEmail
        });
        
        if (subs.length === 0) {
          return Response.json({ allowed: false, reason: 'No active subscription' });
        }
        
        const sub = subs[0];
        
        // Get current usage
        const usageRecords = await base44.asServiceRole.entities.Usage.filter({
          user_email: userEmail,
          feature_type: featureType
        });
        
        const currentUsage = usageRecords.reduce((sum, record) => sum + (record.count || 0), 0);
        
        // Define limits per plan
        const limits = {
          free: { ai_requests: 100, events: 50, tasks: 50 },
          basic: { ai_requests: 1000, events: 500, tasks: 500 },
          pro: { ai_requests: 5000, events: -1, tasks: -1 }, // unlimited
          premium: { ai_requests: -1, events: -1, tasks: -1 } // unlimited
        };
        
        const limit = limits[sub.plan]?.[featureType] || 0;
        const allowed = limit === -1 || currentUsage < limit;
        
        return Response.json({
          allowed,
          currentUsage,
          limit,
          percentageUsed: limit > 0 ? (currentUsage / limit) * 100 : 0
        });
      }

      case 'cancel_with_retention': {
        const { reason, feedback } = data;
        
        // Get subscription
        const subs = await base44.asServiceRole.entities.Subscription.filter({
          stripe_subscription_id: subscriptionId
        });
        
        if (subs.length > 0) {
          const sub = subs[0];
          
          // Offer retention based on reason
          let retentionOffer = null;
          
          if (reason === 'too_expensive') {
            retentionOffer = {
              type: 'discount',
              amount: 20, // 20% off for 3 months
              duration: 3
            };
          } else if (reason === 'not_using_enough') {
            retentionOffer = {
              type: 'pause',
              duration: 2 // pause for 2 months
            };
          }
          
          // Log cancellation request
          await base44.asServiceRole.entities.Subscription.update(sub.id, {
            cancellation_reason: reason,
            cancellation_feedback: feedback,
            cancellation_requested_at: new Date().toISOString()
          });
          
          return Response.json({
            success: true,
            retentionOffer
          });
        }
        
        return Response.json({ success: false, error: 'Subscription not found' });
      }

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Automated billing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});