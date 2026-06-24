import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { invitee_email } = await req.json();
    if (!invitee_email) return Response.json({ error: 'invitee_email required' }, { status: 400 });

    const inviterName = user.full_name || user.email.split('@')[0];
    const appUrl = 'https://vagusplanner.com';
    const inviteUrl = `${appUrl}/connect?invite=${encodeURIComponent(user.email)}`;

    const body = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f7ff; margin: 0; padding: 40px 20px; }
    .card { background: white; max-width: 520px; margin: 0 auto; border-radius: 24px; overflow: hidden; box-shadow: 0 8px 40px rgba(10,31,68,0.12); }
    .header { background: linear-gradient(135deg, #1a4a6e 0%, #1a8ac8 50%, #3ecfa0 100%); padding: 40px 32px; text-align: center; }
    .avatar { width: 72px; height: 72px; border-radius: 50%; background: rgba(255,255,255,0.2); display: inline-flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 900; color: white; margin-bottom: 16px; border: 3px solid rgba(232,184,75,0.6); }
    .header h1 { color: #E8B84B; font-size: 22px; font-weight: 900; margin: 0 0 8px; }
    .header p { color: rgba(255,255,255,0.85); font-size: 14px; margin: 0; }
    .body { padding: 32px; }
    .body p { color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 20px; }
    .features { background: #f8fafc; border-radius: 16px; padding: 20px; margin-bottom: 24px; }
    .feature { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; font-size: 14px; color: #475569; }
    .feature:last-child { margin-bottom: 0; }
    .btn { display: block; background: linear-gradient(135deg, #1a8ac8, #3ecfa0); color: white; text-decoration: none; padding: 16px 32px; border-radius: 14px; font-size: 16px; font-weight: 800; text-align: center; margin-bottom: 16px; }
    .footer { text-align: center; font-size: 12px; color: #94a3b8; padding: 0 32px 24px; }
    .gold { color: #C9A227; font-weight: 700; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="avatar">${inviterName.charAt(0).toUpperCase()}</div>
      <h1>${inviterName} invited you to Vagus Connect</h1>
      <p>Life · Faith · Balance · Together</p>
    </div>
    <div class="body">
      <p>Hey there! <span class="gold">${inviterName}</span> wants to connect with you on <strong>Vagus Planner</strong> — the all-in-one life &amp; faith planner.</p>
      <div class="features">
        <div class="feature">💬 <span>Chat, share events &amp; coordinate life together</span></div>
        <div class="feature">🕌 <span>Islamic features — prayer, Quran, Zakat, Hajj</span></div>
        <div class="feature">📅 <span>Shared calendar &amp; goal tracking</span></div>
        <div class="feature">👨‍👩‍👧‍👦 <span>Family Hub for spiritual accountability</span></div>
      </div>
      <a href="${inviteUrl}" class="btn">Accept Invite &amp; Connect →</a>
      <p style="font-size:13px;color:#94a3b8;text-align:center;">Or go to: <a href="${appUrl}" style="color:#1a8ac8;">${appUrl}</a></p>
    </div>
    <div class="footer">You received this because ${inviterName} (${user.email}) invited you. · Vagus Planner</div>
  </div>
</body>
</html>`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: invitee_email,
      subject: `${inviterName} invited you to Vagus Connect 💬`,
      body,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('inviteToConnect error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});