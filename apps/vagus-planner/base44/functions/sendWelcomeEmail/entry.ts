import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const user_email = payload.user_email || payload.email;
    const user_name = payload.user_name || payload.full_name || 'there';

    if (!user_email) {
      return Response.json({ error: 'user_email required' }, { status: 400 });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Vagus Planner Team <team@vagusplanner.com>',
        to: [user_email],
        reply_to: 'support@vagusplanner.com',
        subject: '🎉 Welcome to Vagus Planner - Your Journey Begins!',
        html: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#071224;padding:40px 24px;">
  <div style="text-align:center;margin-bottom:28px;">
    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6965607bc386491646bad6e8/10b500d37_IMG_6630.png" alt="Vagus Planner" style="width:64px;height:64px;border-radius:16px;margin-bottom:16px;" />
    <h1 style="color:#E8B84B;margin:0 0 8px;font-size:24px;">Welcome to Vagus Planner!</h1>
    <p style="color:#6de4be;font-size:16px;margin:0;">Hi ${user_name}, we're thrilled to have you here! 🎊</p>
  </div>
  <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:28px;margin-bottom:20px;">
    <h2 style="color:#E8B84B;margin-top:0;font-size:18px;">🚀 Quick Start Guide</h2>
    <div style="margin-bottom:14px;"><span style="font-size:20px;">📅</span> <strong style="color:#E8B84B;">Smart Calendar</strong><br><span style="color:#94a3b8;font-size:13px;">AI-powered scheduling that works around your life.</span></div>
    <div style="margin-bottom:14px;"><span style="font-size:20px;">🕌</span> <strong style="color:#E8B84B;">Islamic Mode</strong><br><span style="color:#94a3b8;font-size:13px;">Prayer times, Quran, Zakat, Hajj planner &amp; daily duas.</span></div>
    <div style="margin-bottom:14px;"><span style="font-size:20px;">🤖</span> <strong style="color:#E8B84B;">AI Assistant</strong><br><span style="color:#94a3b8;font-size:13px;">Your 24/7 intelligent companion for scheduling and goals.</span></div>
    <div><span style="font-size:20px;">💚</span> <strong style="color:#E8B84B;">Wellness &amp; Finance</strong><br><span style="color:#94a3b8;font-size:13px;">Track sleep, mood, nutrition, spending and goals in one place.</span></div>
  </div>
  <div style="background:linear-gradient(135deg,#1a4a6e,#1a7ab8);border:1px solid rgba(232,184,75,0.3);border-radius:14px;padding:20px;margin-bottom:20px;text-align:center;">
    <p style="color:#E8B84B;font-size:17px;font-weight:bold;margin:0 0 6px;">🏆 Welcome Badge Unlocked!</p>
    <p style="color:#6de4be;margin:0;font-size:13px;">You've earned the "Early Adopter" badge — visible on your profile.</p>
  </div>
  <div style="text-align:center;margin:28px 0;">
    <a href="https://vagusplanner.com/dashboard" style="display:inline-block;background:linear-gradient(135deg,#E8B84B,#f0c060);color:#071224;padding:14px 36px;text-decoration:none;border-radius:10px;font-weight:bold;font-size:15px;">Open Vagus Planner →</a>
  </div>
  <div style="text-align:center;border-top:1px solid rgba(255,255,255,0.08);padding-top:20px;">
    <p style="color:#475569;font-size:12px;margin:0;">You're receiving this because you signed up for Vagus Planner.<br>Questions? <a href="mailto:support@vagusplanner.com" style="color:#E8B84B;">support@vagusplanner.com</a></p>
  </div>
</div>`
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Resend error:', err);
      return Response.json({ error: err }, { status: 500 });
    }

    console.log(`Welcome email sent to ${user_email}`);
    return Response.json({ success: true });

  } catch (error) {
    console.error('sendWelcomeEmail error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});