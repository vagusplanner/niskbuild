import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// This function is called via entity automation when a new User is created
// OR can be called directly from frontend after first login

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    let targetEmail, targetName;

    // Support direct call with payload OR trigger from entity automation
    let body = {};
    try { body = await req.json(); } catch (_) {}

    targetEmail = body.email || user?.email;
    targetName  = body.full_name || user?.full_name || 'there';

    if (!targetEmail) {
      return Response.json({ error: 'No email provided' }, { status: 400 });
    }

    // Check if we already sent the welcome email
    const key = `welcome_sent_${targetEmail.replace('@','_').replace('.','_')}`;
    const alreadySent = await base44.asServiceRole.entities.UserSettings
      .filter({ created_by: targetEmail }, '-created_date', 1)
      .then(r => r[0]?.welcome_email_sent)
      .catch(() => false);

    if (alreadySent) {
      return Response.json({ skipped: true, reason: 'Welcome email already sent' });
    }

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060f1e;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060f1e;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#0a1a38;border-radius:24px;overflow:hidden;border:1px solid rgba(232,184,75,0.3);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1a4a6e,#1a7ab8,#3ecfa0);padding:40px 40px 30px;text-align:center;">
          <div style="font-size:32px;margin-bottom:8px;">🌙</div>
          <h1 style="color:#E8B84B;font-size:28px;font-weight:900;margin:0 0 8px;letter-spacing:-0.5px;">Welcome to Vagus Planner</h1>
          <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:0;">Life · Faith · Balance</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px;">
          <p style="color:#e2e8f0;font-size:16px;line-height:1.6;margin:0 0 20px;">
            Assalamu Alaikum <strong style="color:#E8B84B;">${targetName}</strong>,<br><br>
            Welcome to <strong>Vagus Planner</strong> — the world's first life OS combining AI productivity, wellness, finance, travel, and a complete Islamic spiritual toolkit in one place.
          </p>

          <div style="background:rgba(232,184,75,0.08);border:1px solid rgba(232,184,75,0.2);border-radius:16px;padding:24px;margin:24px 0;">
            <h3 style="color:#E8B84B;font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin:0 0 16px;">🚀 Get Started</h3>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${[
                ['📅','Smart Calendar','Schedule events with AI assistance and prayer-aware timing'],
                ['🕌','Prayer Times','Enable Islamic Mode for automated prayer scheduling'],
                ['📖','Quran Reader','Track your daily reading with guided plans'],
                ['💰','Finance Tracker','Monitor income, expenses and calculate Zakat'],
                ['🎯','Goals & Habits','Set life goals and build daily habits with streaks'],
              ].map(([emoji, title, desc]) => `
              <tr>
                <td style="padding:8px 0;vertical-align:top;">
                  <span style="font-size:20px;margin-right:12px;">${emoji}</span>
                </td>
                <td style="padding:8px 0;">
                  <strong style="color:#e2e8f0;font-size:14px;">${title}</strong><br>
                  <span style="color:#94a3b8;font-size:12px;">${desc}</span>
                </td>
              </tr>`).join('')}
            </table>
          </div>

          <div style="text-align:center;margin:32px 0;">
            <a href="https://vagusplanner.com/dashboard" style="display:inline-block;background:linear-gradient(135deg,#E8B84B,#f0c060);color:#071224;font-weight:900;font-size:16px;text-decoration:none;padding:16px 40px;border-radius:12px;letter-spacing:-0.3px;">
              Open Your Dashboard →
            </a>
          </div>

          <p style="color:#64748b;font-size:12px;text-align:center;margin:24px 0 0;line-height:1.6;">
            Questions? Reply to this email or visit <a href="https://vagusplanner.com/Contact" style="color:#38bdf8;">our support page</a>.<br>
            You're receiving this because you created a Vagus Planner account.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#071224;padding:20px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
          <p style="color:#475569;font-size:11px;margin:0;">
            © 2026 Vagus Planner · 
            <a href="https://vagusplanner.com/PrivacyPolicy" style="color:#475569;">Privacy</a> · 
            <a href="https://vagusplanner.com/TermsOfService" style="color:#475569;">Terms</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: targetEmail,
      subject: `Welcome to Vagus Planner, ${targetName}! 🌙`,
      body: html,
      from_name: 'Vagus Planner',
    });

    console.log(`Welcome email sent to ${targetEmail}`);
    return Response.json({ success: true, sent_to: targetEmail });
  } catch (error) {
    console.error('onNewUserWelcome error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});