import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { addDays } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get notification settings
    const notificationSettings = await base44.asServiceRole.entities.SubscriptionNotificationSettings.list();
    const settings = notificationSettings[0] || {};

    if (!settings.notify_renewal_reminders) {
      return Response.json({
        success: true,
        message: 'Renewal reminders are disabled',
        sent: 0
      });
    }

    const reminderDaysBefore = settings.renewal_reminder_days_before || 7;

    // Get subscriptions (you would fetch from your Subscription entity)
    const subscriptions = await base44.asServiceRole.entities.Subscription.list();

    let sentCount = 0;

    // Check which subscriptions are approaching renewal
    for (const subscription of subscriptions) {
      if (subscription.status !== 'active' || !subscription.current_period_end) continue;

      const renewalDate = new Date(subscription.current_period_end);
      const today = new Date();
      const reminderDate = addDays(today, reminderDaysBefore);

      // Check if renewal is within the reminder window and hasn't been reminded yet
      if (renewalDate <= reminderDate && renewalDate > today && !subscription.renewal_reminder_sent) {
        try {
          // Send renewal reminder email
          await base44.asServiceRole.functions.invoke('sendSubscriptionNotification', {
            notification_type: 'renewal_reminder',
            user_email: subscription.user_email,
            user_name: subscription.user_name || 'Subscriber',
            plan_name: subscription.plan_name,
            amount: subscription.amount,
            currency: subscription.currency || 'usd',
            renewal_date: subscription.current_period_end,
            subscription_id: subscription.id
          });

          // Mark reminder as sent
          await base44.asServiceRole.entities.Subscription.update(subscription.id, {
            renewal_reminder_sent: true,
            renewal_reminder_sent_date: new Date().toISOString()
          });

          sentCount++;
        } catch (error) {
          console.error(`Failed to send renewal reminder for ${subscription.id}:`, error);
        }
      }
    }

    return Response.json({
      success: true,
      message: `Sent ${sentCount} renewal reminders`,
      sent: sentCount
    });
  } catch (error) {
    console.error('Renewal reminder error:', error);
    return Response.json(
      { error: error.message || 'Failed to send renewal reminders' },
      { status: 500 }
    );
  }
});