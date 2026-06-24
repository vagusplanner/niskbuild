import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

async function sendResendEmail({ to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Vagus Planner <support@vagusplanner.com>',
      to: [to],
      subject,
      html,
      reply_to: 'support@vagusplanner.com',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Resend error:', err);
    throw new Error(`Resend failed: ${err}`);
  }
  return await res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, title, message, recipient_email } = await req.json();
    const toEmail = recipient_email || user.email;

    await sendResendEmail({
      to: toEmail,
      subject: `[Vagus Planner] ${title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #071224;">
          <div style="background: linear-gradient(135deg, #1a4a6e, #1a7ab8); padding: 28px 30px; text-align: center; border-bottom: 2px solid rgba(232,184,75,0.4);">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6965607bc386491646bad6e8/10b500d37_IMG_6630.png" alt="Vagus Planner" style="width:40px;height:40px;border-radius:10px;margin-bottom:12px;" />
            <h1 style="color: #E8B84B; margin: 0; font-size:20px;">${title}</h1>
          </div>
          <div style="padding: 30px; background: rgba(255,255,255,0.03);">
            <p style="font-size: 15px; color: #cbd5e1; line-height: 1.7; margin:0 0 24px;">
              ${message}
            </p>
            <div style="text-align: center;">
              <a href="https://vagusplanner.com/dashboard"
                 style="background: linear-gradient(135deg, #E8B84B, #f0c060); color: #071224; padding: 12px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight:bold;">
                Open Vagus Planner →
              </a>
            </div>
          </div>
          <div style="padding: 20px; text-align: center; border-top: 1px solid rgba(255,255,255,0.08);">
            <p style="color: #475569; font-size: 12px; margin:0;">
              You're receiving this because you have notifications enabled in Vagus Planner.<br>
              Questions? <a href="mailto:support@vagusplanner.com" style="color:#E8B84B;">support@vagusplanner.com</a>
            </p>
          </div>
        </div>
      `
    });

    console.log(`Notification email sent to ${toEmail}: ${title}`);
    return Response.json({ success: true, message: 'Notification sent' });

  } catch (error) {
    console.error('sendNotification error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});