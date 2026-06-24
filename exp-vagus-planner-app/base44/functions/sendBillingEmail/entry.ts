import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Send billing-related emails to users
 * Handles various email types: payment_failed, upgrade_success, cancellation_confirmed, etc.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { emailType, userEmail, data } = await req.json();

    // Fetch user's notification preferences
    const prefs = await base44.asServiceRole.entities.NotificationPreference.filter({
      user_email: userEmail
    });
    const pref = prefs[0];

    // Check if user wants this type of email
    if (pref && !pref.billing_emails) {
      return Response.json({ skipped: true, reason: 'User disabled billing emails' });
    }

    let subject, body;

    switch (emailType) {
      case 'renewal_reminder':
        if (pref && !pref.renewal_reminders) {
          return Response.json({ skipped: true, reason: 'Renewal reminders disabled' });
        }
        subject = '🔔 Your subscription renews soon';
        body = `
          <h2>Subscription Renewal Reminder</h2>
          <p>Hi there,</p>
          <p>Your <strong>${data.planName}</strong> subscription will renew on <strong>${new Date(data.renewalDate).toLocaleDateString()}</strong>.</p>
          <p><strong>Amount:</strong> $${data.amount.toFixed(2)}</p>
          <p>Your payment method ending in ${data.lastFour || '****'} will be charged automatically.</p>
          <p>If you need to update your payment method or cancel, visit your billing settings.</p>
          <br>
          <p>Best regards,<br>The Vagus Planner Team</p>
        `;
        break;

      case 'payment_failed':
        if (pref && !pref.payment_alerts) {
          return Response.json({ skipped: true, reason: 'Payment alerts disabled' });
        }
        subject = '⚠️ Payment Failed - Action Required';
        body = `
          <h2>Payment Failed</h2>
          <p>Hi there,</p>
          <p>We were unable to process your payment for your <strong>${data.planName}</strong> subscription.</p>
          <p><strong>Amount:</strong> $${data.amount.toFixed(2)}</p>
          <p><strong>Reason:</strong> ${data.reason || 'Payment method declined'}</p>
          <p>Please update your payment method as soon as possible to avoid service interruption.</p>
          <p><a href="${data.updateUrl || 'https://billing.stripe.com/login'}">Update Payment Method</a></p>
          <br>
          <p>Best regards,<br>The Vagus Planner Team</p>
        `;
        break;

      case 'upgrade_success':
        if (pref && !pref.upgrade_confirmations) {
          return Response.json({ skipped: true, reason: 'Upgrade confirmations disabled' });
        }
        subject = '🎉 Subscription Upgraded Successfully!';
        body = `
          <h2>Welcome to ${data.planName}!</h2>
          <p>Hi there,</p>
          <p>Your subscription has been successfully upgraded to <strong>${data.planName}</strong>.</p>
          <p><strong>New Features:</strong></p>
          <ul>
            ${data.features?.map(f => `<li>${f}</li>`).join('') || '<li>Enjoy your new plan benefits!</li>'}
          </ul>
          <p><strong>Next Billing Date:</strong> ${new Date(data.nextBillingDate).toLocaleDateString()}</p>
          <p><strong>Amount:</strong> $${data.amount.toFixed(2)}</p>
          <br>
          <p>Thank you for upgrading!<br>The Vagus Planner Team</p>
        `;
        break;

      case 'downgrade_success':
        subject = '✓ Subscription Changed';
        body = `
          <h2>Subscription Updated</h2>
          <p>Hi there,</p>
          <p>Your subscription has been changed to <strong>${data.planName}</strong>.</p>
          <p><strong>Effective Date:</strong> ${new Date(data.effectiveDate).toLocaleDateString()}</p>
          <p><strong>New Amount:</strong> $${data.amount.toFixed(2)}</p>
          <br>
          <p>Best regards,<br>The Vagus Planner Team</p>
        `;
        break;

      case 'cancellation_confirmed':
        subject = '✓ Subscription Cancelled';
        body = `
          <h2>Subscription Cancelled</h2>
          <p>Hi there,</p>
          <p>Your subscription has been cancelled as requested.</p>
          <p><strong>Access Until:</strong> ${new Date(data.accessUntil).toLocaleDateString()}</p>
          <p>You'll continue to have access to your ${data.planName} features until then.</p>
          <p>We're sorry to see you go! If you change your mind, you can resubscribe anytime.</p>
          <br>
          <p>Best regards,<br>The Vagus Planner Team</p>
        `;
        break;

      case 'payment_success':
        subject = '✅ Payment Received - Subscription Activated!';
        body = `
          <h2>Welcome to Vagus Planner Premium!</h2>
          <p>Hi there,</p>
          <p>Thank you for your payment! Your <strong>${data.planName}</strong> subscription is now active.</p>
          <p><strong>Amount Charged:</strong> $${data.amount.toFixed(2)}</p>
          <p><strong>Billing Cycle:</strong> ${data.billingCycle === 'annual' ? 'Annual' : 'Monthly'}</p>
          <p><strong>Payment Date:</strong> ${data.billingDate}</p>
          <p><strong>Next Billing Date:</strong> ${data.nextBillingDate}</p>
          <h3>Your New Features:</h3>
          <ul>
            ${data.planName === 'Enterprise' 
              ? '<li>✨ Unlimited AI Requests</li><li>🚀 Priority Support</li><li>📊 Advanced Analytics</li><li>👥 Team Collaboration</li>' 
              : data.planName === 'Pro'
              ? '<li>✨ 5,000 AI Requests/month</li><li>📧 Email Support</li><li>📊 Advanced Analytics</li>'
              : '<li>✨ 1,000 AI Requests/month</li><li>📱 Core Features</li>'}
          </ul>
          <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ccc;">
            <a href="https://vagusplanner.app/Billing" style="background-color: #14b8a6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">View Your Subscription</a>
          </p>
          <br>
          <p>If you have any questions, please don't hesitate to contact our support team.</p>
          <p>Best regards,<br>The Vagus Planner Team</p>
        `;
        break;

      default:
        return Response.json({ error: 'Invalid email type' }, { status: 400 });
    }

    // Send the email
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'Vagus Planner',
      to: userEmail,
      subject,
      body
    });

    console.log(`✓ Sent ${emailType} email to ${userEmail}`);

    return Response.json({ success: true, emailType });

  } catch (error) {
    console.error('Error sending billing email:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});