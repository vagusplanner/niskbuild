/**
 * Contact form handler — sends via Resend
 * Sends notification to support@vagusplanner.com
 * AND sends an auto-reply to the user
 */

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

async function sendResendEmail({ to, subject, html, from_address = 'support@vagusplanner.com', from_name = 'Vagus Planner', reply_to }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${from_name} <${from_address}>`,
      to: [to],
      subject,
      html,
      ...(reply_to ? { reply_to } : {}),
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
    const { name, email, topic, message } = await req.json();

    if (!name || !email || !topic || !message) {
      return Response.json({ error: 'All fields required' }, { status: 400 });
    }

    // Route enterprise/partnership topics to team@, others to support@
    const isEnterpriseOrPartnership = ['Partnership', 'Billing & Subscription'].includes(topic) ||
      topic?.toLowerCase().includes('enterprise') || topic?.toLowerCase().includes('partner');
    const teamEmail = isEnterpriseOrPartnership ? 'team@vagusplanner.com' : 'support@vagusplanner.com';

    // 1. Send to support team
    await sendResendEmail({
      to: teamEmail,
      subject: `[Contact Form] ${topic} — from ${name}`,
      from_address: 'support@vagusplanner.com',
      from_name: 'Vagus Planner Contact Form',
      reply_to: email,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px;">
          <h2 style="color: #0f3460; margin-top:0;">📬 New Contact Form Submission</h2>
          <table style="width:100%; border-collapse:collapse;">
            <tr><td style="padding:8px 0; color:#64748b; font-size:13px; width:120px;"><strong>Name:</strong></td><td style="padding:8px 0; color:#1e293b;">${name}</td></tr>
            <tr><td style="padding:8px 0; color:#64748b; font-size:13px;"><strong>Email:</strong></td><td style="padding:8px 0;"><a href="mailto:${email}" style="color:#0f3460;">${email}</a></td></tr>
            <tr><td style="padding:8px 0; color:#64748b; font-size:13px;"><strong>Topic:</strong></td><td style="padding:8px 0; color:#1e293b;">${topic}</td></tr>
          </table>
          <div style="background:white; border:1px solid #e2e8f0; border-radius:8px; padding:20px; margin-top:16px;">
            <strong style="color:#64748b; font-size:13px;">Message:</strong>
            <p style="color:#1e293b; margin:8px 0 0; line-height:1.7; white-space:pre-wrap;">${message}</p>
          </div>
          <p style="color:#94a3b8; font-size:12px; margin-top:20px;">Sent via vagusplanner.com contact form</p>
        </div>
      `
    });

    // 2. Auto-reply to user
    await sendResendEmail({
      to: email,
      subject: `We received your message — Vagus Planner`,
      from_address: 'support@vagusplanner.com',
      from_name: 'Vagus Planner Support',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #071224; padding: 40px 24px;">
          <div style="text-align:center; margin-bottom:28px;">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6965607bc386491646bad6e8/10b500d37_IMG_6630.png" alt="Vagus Planner" style="width:56px;height:56px;border-radius:14px;" />
            <h1 style="color:#E8B84B; margin:12px 0 4px; font-size:22px;">We got your message!</h1>
            <p style="color:#6de4be; margin:0; font-size:14px;">Hi ${name}, thank you for reaching out.</p>
          </div>

          <div style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:14px; padding:24px; margin-bottom:20px;">
            <p style="color:#cbd5e1; margin:0 0 12px; font-size:15px; line-height:1.6;">
              We've received your message about <strong style="color:#E8B84B;">${topic}</strong> and our team will get back to you within <strong style="color:#E8B84B;">72 hours</strong>.
            </p>
            <p style="color:#94a3b8; margin:0; font-size:13px;">
              In the meantime, you can explore the app or check out our help section for quick answers.
            </p>
          </div>

          <div style="text-align:center; margin:28px 0;">
            <a href="https://vagusplanner.com/dashboard" style="display:inline-block; background:linear-gradient(135deg,#E8B84B,#f0c060); color:#071224; padding:13px 32px; text-decoration:none; border-radius:10px; font-weight:bold; font-size:15px;">
              Open Vagus Planner →
            </a>
          </div>

          <div style="text-align:center; border-top:1px solid rgba(255,255,255,0.08); padding-top:20px;">
            <p style="color:#475569; font-size:12px; margin:0;">
              © 2026 Vagus Planner · <a href="https://vagusplanner.com/PrivacyPolicy" style="color:#E8B84B;">Privacy Policy</a><br>
              This is a confirmation of your contact form submission.
            </p>
          </div>
        </div>
      `
    });

    console.log(`Contact form submitted by ${email} — topic: ${topic}`);
    return Response.json({ success: true });

  } catch (error) {
    console.error('sendContactForm error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});