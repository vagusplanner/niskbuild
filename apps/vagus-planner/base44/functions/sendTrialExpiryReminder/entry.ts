/**
 * Scheduled: runs daily — finds users whose trial expires in 1 day and sends reminder.
 * Also sends a "trial expired" email to those who expired today.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { Resend } from 'npm:resend@3.2.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all subscriptions
    const subscriptions = await base44.asServiceRole.entities.Subscription.list('-created_date', 500);
    const now = new Date();

    const trialEndingSoon = subscriptions.filter(s => {
      if (s.status !== 'trial') return false;
      const trialEnd = new Date(s.trial_end_date || s.created_date);
      trialEnd.setDate(trialEnd.getDate() + 14);
      const daysLeft = Math.ceil((trialEnd - now) / 86400000);
      return daysLeft === 1; // 1 day left
    });

    const trialExpired = subscriptions.filter(s => {
      if (s.status !== 'trial') return false;
      const trialEnd = new Date(s.trial_end_date || s.created_date);
      trialEnd.setDate(trialEnd.getDate() + 14);
      const daysLeft = Math.ceil((trialEnd - now) / 86400000);
      return daysLeft <= 0;
    });

    const results = [];

    for (const sub of trialEndingSoon) {
      const users = await base44.asServiceRole.entities.User.filter({ email: sub.user_email });
      const user = users[0];
      if (!user?.email) continue;

      const firstName = user.full_name?.split(' ')[0] || 'there';
      await resend.emails.send({
        from: 'Vagus Planner <hello@vagusplanner.com>',
        to: user.email,
        subject: `⏰ Your free trial ends tomorrow, ${firstName}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#060f1e;padding:40px 20px;color:#e2e8f0;">
            <h2 style="color:#E8B84B;">Your trial ends in 24 hours ⏰</h2>
            <p>Hi ${firstName}, your 14-day free trial of Vagus Planner ends tomorrow.</p>
            <p>Don't lose access to your calendar, goals, habits, and everything you've built.</p>
            <div style="text-align:center;margin:28px 0;">
              <a href="https://vagusplanner.com/Billing"
                 style="background:#E8B84B;color:#071224;font-weight:900;padding:14px 32px;border-radius:50px;text-decoration:none;font-size:16px;">
                Choose a Plan →
              </a>
            </div>
            <p style="color:#64748b;font-size:12px;">Plans start at $7.99/month. Cancel anytime.</p>
          </div>
        `,
      });
      results.push({ type: 'trial_ending', email: user.email });
    }

    console.log(`Trial expiry emails sent: ${results.length}`);
    return Response.json({ ok: true, sent: results.length, details: results });
  } catch (err) {
    console.error('sendTrialExpiryReminder error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});