import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Sends a personalized weekly summary email to all users
// Called by a scheduled automation every Monday at 08:00

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both scheduled (service role) and manual admin trigger
    let callerIsAdmin = false;
    try {
      const u = await base44.auth.me();
      callerIsAdmin = u?.role === 'admin';
    } catch (_) { callerIsAdmin = true; } // scheduled calls have no user

    const users = await base44.asServiceRole.entities.User.list('-created_date', 200);
    const now = new Date();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    let sent = 0;
    for (const user of users) {
      if (!user.email) continue;

      // Check opt-out
      const settings = await base44.asServiceRole.entities.UserSettings
        .filter({ created_by: user.email }, '-created_date', 1)
        .then(r => r[0])
        .catch(() => null);

      if (settings?.email_notifications === false) continue;

      // Fetch week stats
      const [events, tasks, prayerLogs] = await Promise.all([
        base44.asServiceRole.entities.Event.filter({ created_by: user.email }, '-created_date', 50),
        base44.asServiceRole.entities.Task ? base44.asServiceRole.entities.Task.filter({ created_by: user.email }, '-created_date', 50).catch(() => []) : [],
        base44.asServiceRole.entities.PrayerLog ? base44.asServiceRole.entities.PrayerLog.filter({ created_by: user.email }, '-date', 35).catch(() => []) : [],
      ]);

      const weekEvents   = events.filter(e => new Date(e.created_date) > weekAgo).length;
      const weekPrayers  = prayerLogs.filter(p => new Date(p.created_date) > weekAgo && p.completed).length;
      const completedTasks = tasks.filter(t => t.status === 'completed' && new Date(t.updated_date) > weekAgo).length;

      const html = `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#060f1e;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#060f1e;padding:40px 20px;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="background:#0a1a38;border-radius:20px;overflow:hidden;border:1px solid rgba(232,184,75,0.2);">
<tr><td style="background:linear-gradient(135deg,#1a4a6e,#1a7ab8);padding:30px 40px;text-align:center;">
  <h1 style="color:#E8B84B;font-size:22px;font-weight:900;margin:0;">Your Weekly Life Report 📊</h1>
  <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:8px 0 0;">Week of ${now.toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}</p>
</td></tr>
<tr><td style="padding:32px 40px;">
  <p style="color:#e2e8f0;font-size:15px;margin:0 0 24px;">Salaam <strong style="color:#E8B84B;">${user.full_name || 'Friend'}</strong>, here's your week at a glance:</p>
  
  <table width="100%" cellpadding="0" cellspacing="12" style="margin-bottom:24px;">
    <tr>
      <td style="background:#0f2e4a;border-radius:12px;padding:16px;text-align:center;width:33%;">
        <div style="font-size:28px;font-weight:900;color:#3ecfa0;">${weekEvents}</div>
        <div style="color:#94a3b8;font-size:11px;margin-top:4px;">Events Created</div>
      </td>
      <td width="8"></td>
      <td style="background:#0f2e4a;border-radius:12px;padding:16px;text-align:center;width:33%;">
        <div style="font-size:28px;font-weight:900;color:#E8B84B;">${weekPrayers}</div>
        <div style="color:#94a3b8;font-size:11px;margin-top:4px;">Prayers Logged</div>
      </td>
      <td width="8"></td>
      <td style="background:#0f2e4a;border-radius:12px;padding:16px;text-align:center;width:33%;">
        <div style="font-size:28px;font-weight:900;color:#38bdf8;">${completedTasks}</div>
        <div style="color:#94a3b8;font-size:11px;margin-top:4px;">Tasks Done</div>
      </td>
    </tr>
  </table>

  <div style="text-align:center;margin:24px 0;">
    <a href="https://vagusplanner.com/dashboard" style="display:inline-block;background:linear-gradient(135deg,#E8B84B,#f0c060);color:#071224;font-weight:900;font-size:14px;text-decoration:none;padding:14px 32px;border-radius:10px;">
      View Full Dashboard →
    </a>
  </div>

  <p style="color:#475569;font-size:11px;text-align:center;margin:16px 0 0;">
    <a href="https://vagusplanner.com/Account" style="color:#475569;">Unsubscribe from weekly emails</a> · 
    <a href="https://vagusplanner.com/PrivacyPolicy" style="color:#475569;">Privacy Policy</a>
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject: `Your Vagus Planner Weekly Report 🌙`,
        body: html,
        from_name: 'Vagus Planner',
      });
      sent++;
    }

    return Response.json({ success: true, emails_sent: sent });
  } catch (error) {
    console.error('sendWeeklyDigest error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});