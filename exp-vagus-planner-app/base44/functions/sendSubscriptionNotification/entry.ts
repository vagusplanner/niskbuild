import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      notification_type, // 'signup', 'cancellation', 'payment_failed', 'upgrade', 'downgrade', 'renewal_reminder'
      user_email,
      user_name,
      plan_name,
      amount,
      currency,
      renewal_date,
      old_plan,
      new_plan,
      subscription_id
    } = body;

    // Fetch notification settings
    const notificationSettings = await base44.asServiceRole.entities.SubscriptionNotificationSettings.filter({});
    const settings = notificationSettings[0] || {};

    // Check if this notification type is enabled
    const enabledNotifications = {
      signup: settings.notify_new_signups !== false,
      cancellation: settings.notify_cancellations !== false,
      payment_failed: settings.notify_payment_failures !== false,
      upgrade: settings.notify_upgrades !== false,
      downgrade: settings.notify_downgrades !== false,
      renewal_reminder: settings.notify_renewal_reminders !== false
    };

    if (!enabledNotifications[notification_type]) {
      return Response.json({
        success: true,
        message: 'Notification type is disabled',
        sent: false
      });
    }

    // Build email based on notification type
    let emailSubject = '';
    let emailBody = '';

    switch (notification_type) {
      case 'signup':
        emailSubject = `Welcome to Vagus Planner - ${plan_name} Plan`;
        emailBody = `
          <h2>Welcome, ${user_name}!</h2>
          <p>Thank you for signing up to Vagus Planner with the <strong>${plan_name}</strong> plan.</p>
          <p><strong>Plan Details:</strong></p>
          <ul>
            <li>Plan: ${plan_name}</li>
            <li>Amount: ${currency.toUpperCase()} ${amount}/month</li>
            <li>Status: Active</li>
          </ul>
          <p>You can now enjoy all the features of your plan. Visit your account settings to customize your preferences.</p>
          <p>Need help? Check out our <a href="https://vagusplanner.com/support">support center</a>.</p>
        `;
        break;

      case 'cancellation':
        emailSubject = 'Your Vagus Planner Subscription Has Been Cancelled';
        emailBody = `
          <h2>Subscription Cancelled</h2>
          <p>Hello ${user_name},</p>
          <p>We're sorry to see you go. Your <strong>${plan_name}</strong> plan has been cancelled.</p>
          <p><strong>Cancellation Details:</strong></p>
          <ul>
            <li>Plan: ${plan_name}</li>
            <li>Cancellation Date: ${new Date().toLocaleDateString()}</li>
            <li>Access Ends: ${renewal_date ? new Date(renewal_date).toLocaleDateString() : 'Immediately'}</li>
          </ul>
          <p>If you'd like to reactivate your subscription, you can do so anytime from your account settings.</p>
          <p>We'd love your feedback on why you left. <a href="https://vagusplanner.com/feedback">Share your thoughts</a>.</p>
        `;
        break;

      case 'payment_failed':
        emailSubject = 'Payment Failed for Your Vagus Planner Subscription';
        emailBody = `
          <h2>Payment Failed</h2>
          <p>Hello ${user_name},</p>
          <p>We attempted to charge your payment method for your <strong>${plan_name}</strong> subscription but it failed.</p>
          <p><strong>Payment Details:</strong></p>
          <ul>
            <li>Amount: ${currency.toUpperCase()} ${amount}</li>
            <li>Date Attempted: ${new Date().toLocaleDateString()}</li>
            <li>Subscription: ${subscription_id}</li>
          </ul>
          <p>Please <a href="https://vagusplanner.com/billing">update your payment method</a> to prevent service interruption.</p>
          <p>We'll retry the payment automatically. If you need immediate help, contact our <a href="https://vagusplanner.com/support">support team</a>.</p>
        `;
        break;

      case 'upgrade':
        emailSubject = `Plan Upgrade Confirmed - Welcome to ${new_plan}`;
        emailBody = `
          <h2>Plan Upgrade Confirmed!</h2>
          <p>Hello ${user_name},</p>
          <p>Your subscription has been successfully upgraded to the <strong>${new_plan}</strong> plan.</p>
          <p><strong>Upgrade Details:</strong></p>
          <ul>
            <li>Previous Plan: ${old_plan}</li>
            <li>New Plan: ${new_plan}</li>
            <li>New Amount: ${currency.toUpperCase()} ${amount}</li>
            <li>Effective Date: ${new Date().toLocaleDateString()}</li>
          </ul>
          <p>You now have access to all premium features. Enjoy your enhanced experience!</p>
          <p>Have questions? <a href="https://vagusplanner.com/support">Contact support</a>.</p>
        `;
        break;

      case 'downgrade':
        emailSubject = `Plan Downgrade Confirmed - You're Now on ${new_plan}`;
        emailBody = `
          <h2>Plan Downgrade Confirmed</h2>
          <p>Hello ${user_name},</p>
          <p>Your subscription has been successfully downgraded to the <strong>${new_plan}</strong> plan.</p>
          <p><strong>Downgrade Details:</strong></p>
          <ul>
            <li>Previous Plan: ${old_plan}</li>
            <li>New Plan: ${new_plan}</li>
            <li>New Amount: ${currency.toUpperCase()} ${amount}</li>
            <li>Effective Date: ${new Date().toLocaleDateString()}</li>
          </ul>
          <p>Your new plan will take effect on your next billing date. You can upgrade anytime.</p>
          <p>Need help? <a href="https://vagusplanner.com/support">Contact our support team</a>.</p>
        `;
        break;

      case 'renewal_reminder':
        emailSubject = `Reminder: Your Vagus Planner Subscription Renews Soon`;
        emailBody = `
          <h2>Renewal Reminder</h2>
          <p>Hello ${user_name},</p>
          <p>Your <strong>${plan_name}</strong> subscription will renew on <strong>${renewal_date ? new Date(renewal_date).toLocaleDateString() : 'soon'}</strong>.</p>
          <p><strong>Renewal Details:</strong></p>
          <ul>
            <li>Plan: ${plan_name}</li>
            <li>Amount: ${currency.toUpperCase()} ${amount}</li>
            <li>Renewal Date: ${renewal_date ? new Date(renewal_date).toLocaleDateString() : 'Not specified'}</li>
          </ul>
          <p>Make sure your payment method is up to date. <a href="https://vagusplanner.com/billing">Update payment method</a>.</p>
          <p>If you'd like to cancel or change your plan, you can do so anytime.</p>
        `;
        break;

      default:
        return Response.json({ error: 'Invalid notification type' }, { status: 400 });
    }

    // Send email via SendEmail integration
    const { data } = await base44.integrations.Core.SendEmail({
      to: user_email,
      subject: emailSubject,
      body: emailBody,
      from_name: 'Vagus Planner Billing'
    });

    // Log the notification
    await base44.asServiceRole.entities.SubscriptionEmailLog.create({
      user_email,
      notification_type,
      subject: emailSubject,
      sent_date: new Date().toISOString(),
      status: 'sent',
      subscription_id
    });

    return Response.json({
      success: true,
      message: `${notification_type} notification sent to ${user_email}`,
      sent: true
    });
  } catch (error) {
    console.error('Email notification error:', error);
    return Response.json(
      { error: error.message || 'Failed to send notification' },
      { status: 500 }
    );
  }
});