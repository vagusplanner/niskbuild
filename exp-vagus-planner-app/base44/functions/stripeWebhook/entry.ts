import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return Response.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    // Verify webhook signature (async version for Deno)
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    );

    console.log('Webhook event received:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userEmail = session.metadata?.user_email || session.customer_email;
        const planName = session.metadata?.plan_name || 'unknown';
        const billingCycle = session.metadata?.billing_cycle || 'monthly';
        const amount = session.amount_total / 100;
        
        console.log('Checkout completed for:', userEmail, 'plan:', planName);

        // Create or update subscription entity
        await base44.asServiceRole.entities.Subscription.create({
          user_email: userEmail,
          stripe_subscription_id: session.subscription,
          stripe_customer_id: session.customer,
          plan: planName,
          status: 'active',
          billing_cycle: billingCycle,
          amount: amount,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });

        // Update UserSettings with subscription_plan so Islamic Edition gate works
        if (userEmail) {
          try {
            const userSettingsList = await base44.asServiceRole.entities.UserSettings.filter({ created_by: userEmail });
            const isIslamicPlan = planName.toLowerCase().includes('islamic');
            if (userSettingsList.length > 0) {
              await base44.asServiceRole.entities.UserSettings.update(userSettingsList[0].id, {
                subscription_plan: planName,
                islamic_mode: isIslamicPlan ? true : userSettingsList[0].islamic_mode,
              });
            } else {
              await base44.asServiceRole.entities.UserSettings.create({
                created_by: userEmail,
                subscription_plan: planName,
                islamic_mode: isIslamicPlan,
              });
            }
            console.log(`[Webhook] Updated subscription_plan=${planName} for ${userEmail}`);
          } catch (settingsErr) {
            console.error('[Webhook] Failed to update UserSettings subscription_plan:', settingsErr);
          }
        }

        // Send payment confirmation email
        try {
          await base44.asServiceRole.functions.invoke('sendBillingEmail', {
            emailType: 'payment_success',
            userEmail,
            data: {
              planName: planName.charAt(0).toUpperCase() + planName.slice(1),
              amount: amount,
              billingCycle: billingCycle,
              billingDate: new Date().toLocaleDateString(),
              nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
            }
          });
        } catch (emailError) {
          console.error('Failed to send payment confirmation email:', emailError);
        }

        // Create in-app notification
        try {
          await base44.asServiceRole.entities.Notification.create({
            user_email: userEmail,
            type: 'payment_success',
            title: `Welcome to ${planName.charAt(0).toUpperCase() + planName.slice(1)}!`,
            message: `Your subscription is now active. You have access to all premium features.`,
            icon: '🎉',
            action_url: '/Billing',
            is_read: false
          });
        } catch (notifError) {
          console.error('Failed to create notification:', notifError);
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const userEmail = subscription.metadata?.user_email;

        if (userEmail) {
          // Find existing subscription
          const subscriptions = await base44.asServiceRole.entities.Subscription.filter({
            user_email: userEmail
          });

          if (subscriptions.length > 0) {
            const oldPlan = subscriptions[0].plan;
            const newPlan = subscription.metadata?.plan_name || oldPlan;

            await base44.asServiceRole.entities.Subscription.update(subscriptions[0].id, {
              status: subscription.status,
              plan: newPlan,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            });

            // Send upgrade/downgrade confirmation if plan changed
            if (oldPlan !== newPlan) {
              try {
                await base44.asServiceRole.functions.invoke('sendBillingEmail', {
                  emailType: 'upgrade_success',
                  userEmail,
                  data: {
                    planName: newPlan.charAt(0).toUpperCase() + newPlan.slice(1),
                    amount: subscription.plan.amount / 100,
                    nextBillingDate: new Date(subscription.current_period_end * 1000).toISOString(),
                    features: newPlan === 'premium' 
                      ? ['Unlimited AI requests', 'Priority support', 'Advanced analytics']
                      : newPlan === 'pro'
                      ? ['5000 AI requests/month', 'Email support', 'Advanced features']
                      : ['1000 AI requests/month', 'Standard features']
                  }
                });
              } catch (emailError) {
                console.error('Failed to send plan change email:', emailError);
              }
            }
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userEmail = subscription.metadata?.user_email;

        if (userEmail) {
          const subscriptions = await base44.asServiceRole.entities.Subscription.filter({
            user_email: userEmail
          });

          if (subscriptions.length > 0) {
            const oldPlan = subscriptions[0].plan;
            
            await base44.asServiceRole.entities.Subscription.update(subscriptions[0].id, {
              status: 'canceled',
              canceled_at: new Date().toISOString()
            });

            // Send cancellation confirmation email
            try {
              await base44.asServiceRole.functions.invoke('sendBillingEmail', {
                emailType: 'cancellation_confirmed',
                userEmail,
                data: {
                  planName: oldPlan.charAt(0).toUpperCase() + oldPlan.slice(1),
                  accessUntil: new Date(subscription.current_period_end * 1000).toISOString()
                }
              });
            } catch (emailError) {
              console.error('Failed to send cancellation email:', emailError);
            }
          }
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        const userEmail = invoice.customer_email;

        console.log('Processing paid invoice:', invoice.id, 'for user:', userEmail);

        // Get subscription details for plan info
        let planName = 'basic';
        let billingCycle = 'monthly';
        
        if (invoice.subscription) {
          try {
            const stripeSubscription = await stripe.subscriptions.retrieve(invoice.subscription);
            const priceId = stripeSubscription.items.data[0]?.price.id;
            const interval = stripeSubscription.items.data[0]?.price.recurring?.interval;
            
            // Map price IDs to plan names
            const planMapping = {
              'price_1QoqYfP1cxxNpw2sATLZqVJD': 'basic',
              'price_1QoqYfP1cxxNpw2skRsVBVGd': 'basic',
              'price_1QoqYxP1cxxNpw2suA1lmEQs': 'pro',
              'price_1QoqYxP1cxxNpw2sXZLxPTDz': 'pro',
              'price_1QoqZBP1cxxNpw2sqVKwVWHb': 'premium',
              'price_1QoqZBP1cxxNpw2sOFNv4KE3': 'premium'
            };
            
            planName = planMapping[priceId] || 'basic';
            billingCycle = interval === 'year' ? 'annual' : 'monthly';
            
            console.log('Mapped plan:', planName, 'billing cycle:', billingCycle);
          } catch (subError) {
            console.error('Error fetching subscription details:', subError);
          }
        }

        // Create detailed invoice record
        try {
          await base44.asServiceRole.entities.Invoice.create({
            user_email: userEmail,
            stripe_invoice_id: invoice.id,
            amount: invoice.amount_paid / 100,
            currency: invoice.currency.toUpperCase(),
            status: 'paid',
            plan: planName,
            billing_cycle: billingCycle,
            period_start: new Date(invoice.period_start * 1000).toISOString().split('T')[0],
            period_end: new Date(invoice.period_end * 1000).toISOString().split('T')[0],
            issued_date: new Date(invoice.created * 1000).toISOString().split('T')[0],
            due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString().split('T')[0] : null,
            paid_date: new Date(invoice.status_transitions.paid_at * 1000).toISOString(),
            pdf_url: invoice.invoice_pdf,
            description: invoice.lines.data[0]?.description || `${planName.charAt(0).toUpperCase() + planName.slice(1)} Plan - ${billingCycle === 'annual' ? 'Annual' : 'Monthly'} Subscription`
          });
          
          console.log('Invoice record created successfully');
        } catch (createError) {
          console.error('Failed to create invoice record:', createError);
        }

        // Send payment confirmation email
        try {
          await base44.asServiceRole.functions.invoke('sendBillingEmail', {
            emailType: 'payment_success',
            userEmail,
            data: {
              planName: planName.charAt(0).toUpperCase() + planName.slice(1),
              amount: invoice.amount_paid / 100,
              invoiceUrl: invoice.hosted_invoice_url,
              pdfUrl: invoice.invoice_pdf,
              billingDate: new Date(invoice.created * 1000).toLocaleDateString(),
              nextBillingDate: new Date(invoice.period_end * 1000).toLocaleDateString()
            }
          });
        } catch (emailError) {
          console.error('Failed to send payment confirmation email:', emailError);
        }
        
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const userEmail = invoice.customer_email;

        console.log('Processing failed invoice:', invoice.id, 'for user:', userEmail);

        // Create failed invoice record
        try {
          await base44.asServiceRole.entities.Invoice.create({
            user_email: userEmail,
            stripe_invoice_id: invoice.id,
            amount: invoice.amount_due / 100,
            currency: invoice.currency.toUpperCase(),
            status: 'open',
            issued_date: new Date(invoice.created * 1000).toISOString().split('T')[0],
            due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString().split('T')[0] : null,
            description: `Payment Failed: ${invoice.lines.data[0]?.description || 'Subscription Payment'}`
          });
        } catch (createError) {
          console.error('Failed to create failed invoice record:', createError);
        }

        // Find subscription for more context
        const subscriptions = await base44.asServiceRole.entities.Subscription.filter({
          stripe_subscription_id: invoice.subscription
        });

        if (subscriptions.length > 0) {
          const currentRetry = subscriptions[0].payment_retry_count || 0;
          
          // Update subscription status and retry count
          await base44.asServiceRole.entities.Subscription.update(subscriptions[0].id, {
            status: 'past_due',
            payment_retry_count: currentRetry + 1,
            last_payment_failed_at: new Date().toISOString()
          });

          // Send payment failure alert
          try {
            await base44.asServiceRole.functions.invoke('sendBillingEmail', {
              emailType: 'payment_failed',
              userEmail,
              data: {
                planName: subscriptions[0].plan.charAt(0).toUpperCase() + subscriptions[0].plan.slice(1),
                amount: invoice.amount_due / 100,
                reason: invoice.last_payment_error?.message || 'Payment method declined',
                updateUrl: 'https://billing.stripe.com/login',
                retryCount: currentRetry + 1
              }
            });
          } catch (emailError) {
            console.error('Failed to send payment failure email:', emailError);
          }

          // Apply grace period if this is the 3rd retry
          if (currentRetry === 2) {
            try {
              await base44.asServiceRole.functions.invoke('automatedBillingHandler', {
                action: 'apply_grace_period',
                subscriptionId: invoice.subscription
              });
            } catch (graceError) {
              console.error('Failed to apply grace period:', graceError);
            }
          }
        }
        break;
      }

      case 'invoice.upcoming': {
        // Send renewal reminder 3 days before
        const invoice = event.data.object;
        const userEmail = invoice.customer_email;
        const subscriptions = await base44.asServiceRole.entities.Subscription.filter({
          stripe_subscription_id: invoice.subscription
        });

        if (subscriptions.length > 0) {
          try {
            await base44.asServiceRole.functions.invoke('sendRenewalReminders', {
              userEmail,
              planName: subscriptions[0].plan,
              amount: invoice.amount_due / 100,
              renewalDate: new Date(invoice.period_end * 1000).toISOString()
            });
          } catch (emailError) {
            console.error('Failed to send renewal reminder:', emailError);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return Response.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 400 });
  }
});