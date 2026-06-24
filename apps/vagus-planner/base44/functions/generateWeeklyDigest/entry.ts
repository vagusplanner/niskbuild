/**
 * Generates and sends a weekly email digest.
 * Called manually (Send Now) or by scheduled automation every Monday 9am.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { Resend } from 'npm:resend@3.2.0';
import { addDays, startOfWeek, endOfWeek, format } from 'npm:date-fns@3.6.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Auth — can be called by a user (Send Now) or scheduled (service role)
    let userEmail = body.email;
    let userName = 'there';

    if (!userEmail) {
      const user = await base44.auth.me();
      if (!user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      userEmail = user.email;
      userName = user.full_name?.split(' ')[0] || 'there';
    } else {
      // Scheduled mode — lookup name
      const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
      userName = users[0]?.full_name?.split(' ')[0] || 'there';
    }

    const now = new Date();
    const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'MMM d');
    const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'MMM d, yyyy');

    // Gather data
    const [events, tasks, goals, expenses, habits] = await Promise.all([
      base44.asServiceRole.entities.Event.filter({
        created_by: userEmail,
        start_date: { $gte: now.toISOString(), $lte: addDays(now, 7).toISOString() }
      }, 'start_date', 20),
      base44.asServiceRole.entities.Task.filter({ created_by: userEmail, status: { $in: ['todo', 'in_progress'] } }, '-priority', 5),
      base44.asServiceRole.entities.Goal.filter({ created_by: userEmail, status: 'in_progress' }, '-priority', 5),
      base44.asServiceRole.entities.Expense.filter({ created_by: userEmail }, '-date', 50),
      base44.asServiceRole.entities.Habit.filter({ created_by: userEmail }, '-created_date', 10),
    ]);

    const totalExpense = expenses.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount || 0), 0);
    const totalIncome = expenses.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);

    const eventsHtml = events.slice(0, 5).map(e => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #1e3a5f;color:#94a3b8;font-size:13px;">
          ${e.start_date ? format(new Date(e.start_date), 'EEE MMM d, h:mm a') : 'All day'}
        </td>
        <td style="padding:8px 0 8px 16px;border-bottom:1px solid #1e3a5f;color:#e2e8f0;font-size:13px;font-weight:600;">${e.title}</td>
      </tr>
    `).join('');

    const tasksHtml = tasks.slice(0, 5).map(t => `
      <li style="padding:6px 0;color:#cbd5e1;font-size:13px;border-bottom:1px solid #1e3a5f;">
        <span style="color:${t.priority === 'urgent' ? '#ef4444' : t.priority === 'high' ? '#f97316' : '#38bdf8'};">●</span>
        &nbsp;${t.title}${t.due_date ? `<span style="color:#64748b;margin-left:8px;font-size:11px;">${format(new Date(t.due_date), 'MMM d')}</span>` : ''}
      </li>
    `).join('');

    const goalsHtml = goals.slice(0, 3).map(g => `
      <div style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="color:#e2e8f0;font-size:13px;font-weight:600;">${g.title}</span>
          <span style="color:#E8B84B;font-size:13px;font-weight:700;">${g.progress || 0}%</span>
        </div>
        <div style="height:6px;background:#1e3a5f;border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${g.progress || 0}%;background:linear-gradient(90deg,#6366f1,#8b5cf6);border-radius:3px;"></div>
        </div>
      </div>
    `).join('');

    const { error } = await resend.emails.send({
      from: 'Vagus Planner <hello@vagusplanner.com>',
      to: userEmail,
      subject: `📅 Your Week: ${weekStart} – ${weekEnd}`,
      html: `
        <!DOCTYPE html><html>
        <body style="margin:0;padding:0;background:#060f1e;font-family:'Segoe UI',Arial,sans-serif;">
        <div style="max-width:600px;margin:0 auto;padding:32px 20px;">

          <!-- Header -->
          <div style="text-align:center;margin-bottom:24px;">
            <div style="display:inline-block;background:linear-gradient(135deg,#1a4a6e,#1a7ab8);border-radius:16px;padding:16px 28px;">
              <div style="color:#E8B84B;font-size:20px;font-weight:900;">Vagus Planner</div>
              <div style="color:#6de4be;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-top:2px;">Weekly Digest</div>
            </div>
          </div>

          <h1 style="color:#E8B84B;font-size:22px;font-weight:900;margin:0 0 4px;">Hi ${userName}! 👋</h1>
          <p style="color:#64748b;font-size:14px;margin:0 0 24px;">Here's your summary for <strong style="color:#94a3b8;">${weekStart} – ${weekEnd}</strong></p>

          <!-- Finance summary -->
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:24px;">
            <div style="background:#0a1a38;border:1px solid #1e3a5f;border-radius:12px;padding:14px;text-align:center;">
              <div style="color:#ef4444;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Spent</div>
              <div style="color:#f1f5f9;font-size:20px;font-weight:900;margin-top:4px;">$${totalExpense.toFixed(0)}</div>
            </div>
            <div style="background:#0a1a38;border:1px solid #1e3a5f;border-radius:12px;padding:14px;text-align:center;">
              <div style="color:#10b981;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Income</div>
              <div style="color:#f1f5f9;font-size:20px;font-weight:900;margin-top:4px;">$${totalIncome.toFixed(0)}</div>
            </div>
            <div style="background:#0a1a38;border:1px solid #1e3a5f;border-radius:12px;padding:14px;text-align:center;">
              <div style="color:#E8B84B;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Events</div>
              <div style="color:#f1f5f9;font-size:20px;font-weight:900;margin-top:4px;">${events.length}</div>
            </div>
          </div>

          <!-- Events -->
          ${events.length > 0 ? `
          <div style="background:#0a1a38;border:1px solid #1e3a5f;border-radius:12px;padding:18px;margin-bottom:16px;">
            <div style="color:#38bdf8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">📅 Upcoming Events</div>
            <table style="width:100%;border-collapse:collapse;">${eventsHtml}</table>
          </div>` : ''}

          <!-- Tasks -->
          ${tasks.length > 0 ? `
          <div style="background:#0a1a38;border:1px solid #1e3a5f;border-radius:12px;padding:18px;margin-bottom:16px;">
            <div style="color:#f97316;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">✅ Pending Tasks</div>
            <ul style="margin:0;padding:0;list-style:none;">${tasksHtml}</ul>
          </div>` : ''}

          <!-- Goals -->
          ${goals.length > 0 ? `
          <div style="background:#0a1a38;border:1px solid #1e3a5f;border-radius:12px;padding:18px;margin-bottom:24px;">
            <div style="color:#8b5cf6;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">🎯 Active Goals</div>
            ${goalsHtml}
          </div>` : ''}

          <!-- CTA -->
          <div style="text-align:center;margin-bottom:24px;">
            <a href="https://vagusplanner.com/dashboard"
               style="display:inline-block;background:linear-gradient(135deg,#E8B84B,#f0c060);color:#071224;font-weight:900;font-size:15px;padding:12px 32px;border-radius:50px;text-decoration:none;">
              Open Planner →
            </a>
          </div>

          <div style="text-align:center;color:#1e3a5f;font-size:11px;">
            © 2026 Vagus Planner ·
            <a href="https://vagusplanner.com/PrivacyPolicy" style="color:#334155;">Privacy</a> ·
            <a href="https://vagusplanner.com/TermsOfService" style="color:#334155;">Terms</a>
          </div>
        </div>
        </body></html>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return Response.json({ ok: false, error }, { status: 500 });
    }

    console.log(`Weekly digest sent to ${userEmail}`);
    return Response.json({ ok: true, sent_to: userEmail });
  } catch (err) {
    console.error('generateWeeklyDigest error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});