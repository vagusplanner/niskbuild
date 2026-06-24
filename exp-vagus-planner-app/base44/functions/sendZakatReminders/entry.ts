import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const ZAKAT_RATE = 0.025;
const NISAB_SILVER_GRAMS = 612.36;

// Send email via Resend
async function sendEmail({ to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Vagus Planner <notifications@vagusplanner.com>',
      to,
      subject,
      html,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Resend error: ${JSON.stringify(data)}`);
  return data;
}

function buildEmailHtml({ userName, zakatDue, currency, sym, totalWealth, dueDate, daysSinceDue, isPastDue }) {
  const urgencyColor = isPastDue ? '#ef4444' : '#f59e0b';
  const urgencyLabel = isPastDue
    ? `⚠️ ${daysSinceDue} day${daysSinceDue !== 1 ? 's' : ''} overdue`
    : `Due on ${dueDate}`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',system-ui,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:32px 28px;text-align:center;">
      <p style="margin:0;font-size:28px;">🕌</p>
      <h1 style="margin:8px 0 4px;color:#fff;font-size:22px;font-weight:800;">Zakāt Reminder</h1>
      <p style="margin:0;color:#fef3c7;font-size:13px;">Vagus Planner · Annual Obligation</p>
    </div>

    <!-- Body -->
    <div style="padding:28px;">
      <p style="color:#374151;font-size:15px;margin:0 0 16px;">
        As-salāmu ʿalaykum${userName ? `, ${userName}` : ''},
      </p>

      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;">
        This is your annual Zakāt al-Māl reminder based on your payment history recorded in Vagus Planner.
      </p>

      <!-- Status badge -->
      <div style="background:${urgencyColor}15;border:1px solid ${urgencyColor}40;border-radius:10px;padding:12px 16px;margin-bottom:20px;text-align:center;">
        <p style="margin:0;color:${urgencyColor};font-weight:700;font-size:14px;">${urgencyLabel}</p>
      </div>

      <!-- Amounts -->
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:20px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#374151;font-size:14px;">Total Zakatable Wealth</td>
            <td style="padding:6px 0;color:#1a5c52;font-weight:700;text-align:right;font-size:14px;">${sym}${totalWealth.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#374151;font-size:14px;">Zakāt Rate</td>
            <td style="padding:6px 0;color:#1a5c52;font-weight:700;text-align:right;font-size:14px;">2.5%</td>
          </tr>
          <tr style="border-top:2px solid #86efac;">
            <td style="padding:10px 0 6px;color:#064e3b;font-weight:800;font-size:16px;">Zakāt Due</td>
            <td style="padding:10px 0 6px;color:#059669;font-weight:900;text-align:right;font-size:22px;">${sym}${zakatDue.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
          </tr>
        </table>
      </div>

      <!-- Quranic verse -->
      <div style="background:#faf5ff;border-left:4px solid #a855f7;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:24px;">
        <p style="margin:0;font-size:16px;text-align:right;color:#6b21a8;font-family:serif;line-height:2;" dir="rtl" lang="ar">
          وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ
        </p>
        <p style="margin:6px 0 0;font-size:12px;color:#7e22ce;font-style:italic;">
          "Establish prayer and give Zakāt" — Al-Baqarah 2:43
        </p>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:24px;">
        <a href="https://vagusplanner.com/ZakatCalculator"
           style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:14px;letter-spacing:0.02em;">
          Open Zakāt Calculator →
        </a>
      </div>

      <!-- Tips -->
      <div style="background:#f8fafc;border-radius:10px;padding:16px;font-size:13px;color:#64748b;line-height:1.6;">
        <strong style="color:#374151;">Quick reminders:</strong><br>
        • Zakāt is due after one full lunar year (Hawl) on wealth above Nisab<br>
        • You can pay in instalments — record each in the app<br>
        • Nisab threshold (silver): ${NISAB_SILVER_GRAMS}g of silver<br>
        • Consult your local imam or scholar for specific rulings
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:16px 28px;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="margin:0;color:#94a3b8;font-size:11px;">
        Vagus Planner · Life, Faith & Balance<br>
        You received this because you have Zakāt reminders enabled.<br>
        <a href="https://vagusplanner.com/Settings" style="color:#94a3b8;">Manage preferences</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled invocation (no user) OR admin-initiated
    let isScheduled = false;
    try {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch {
      // No auth token — accept if called by automation
      isScheduled = true;
    }

    console.log(`[ZakatReminders] Starting check. Scheduled=${isScheduled}`);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Get all users
    const users = await base44.asServiceRole.entities.User.list();
    console.log(`[ZakatReminders] Found ${users.length} users`);

    let emailsSent = 0;
    let skipped = 0;
    const results = [];

    for (const user of users) {
      if (!user.email) { skipped++; continue; }

      try {
        // Get this user's Zakat calculation history
        const payments = await base44.asServiceRole.entities.ZakatCalculation.filter(
          { created_by: user.email },
          '-created_date',
          50
        );

        if (payments.length === 0) { skipped++; continue; }

        // Most recent payment/calculation
        const latest = payments[0];
        const latestDate = new Date(latest.calculation_date || latest.created_date);

        // Check if ~1 Hijri year has passed (354 days) since last calculation
        const HIJRI_YEAR_DAYS = 354;
        const daysSince = Math.floor((today - latestDate) / (1000 * 60 * 60 * 24));

        // Remind at: 340 days (2 weeks early), 354 days (due), 361 days (1 week late), 368 days (2 weeks late)
        const REMIND_AT_DAYS = [340, 354, 361, 368];
        const shouldRemind = REMIND_AT_DAYS.includes(daysSince);

        if (!shouldRemind) { skipped++; continue; }

        // Check if we already sent a reminder today for this user
        const alreadySentKey = `zakat_reminder_sent_${user.email}_${todayStr}`;
        // (We use a notification log check as a proxy — skip duplicate guard for simplicity in worker context)

        // Determine Zakat due from latest calculation
        const zakatDue = latest.zakat_due || (latest.total_zakatable_wealth * ZAKAT_RATE);
        const paidThisYear = payments
          .filter(p => new Date(p.created_date).getFullYear() === today.getFullYear() && p.amount_paid > 0)
          .reduce((s, p) => s + (p.amount_paid || 0), 0);
        const remaining = Math.max(0, zakatDue - paidThisYear);

        if (remaining <= 0) {
          console.log(`[ZakatReminders] ${user.email} — Zakat fully paid, skipping`);
          skipped++;
          continue;
        }

        // Detect currency from notes field
        const notesMatch = latest.notes?.match(/Currency:\s*([A-Z]{3})/);
        const currency = notesMatch ? notesMatch[1] : 'GBP';
        const currencySymbols = {
          GBP: '£', USD: '$', EUR: '€', AED: 'د.إ', SAR: '﷼',
          PKR: '₨', BDT: '৳', MYR: 'RM', CAD: 'C$', AUD: 'A$', TRY: '₺',
        };
        const sym = currencySymbols[currency] || '£';

        const isPastDue = daysSince >= HIJRI_YEAR_DAYS;
        const dueDate = new Date(latestDate.getTime() + HIJRI_YEAR_DAYS * 24 * 60 * 60 * 1000)
          .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

        const html = buildEmailHtml({
          userName: user.full_name,
          zakatDue: remaining,
          currency,
          sym,
          totalWealth: latest.total_zakatable_wealth || 0,
          dueDate,
          daysSinceDue: isPastDue ? daysSince - HIJRI_YEAR_DAYS : 0,
          isPastDue,
        });

        const subject = isPastDue
          ? `⚠️ Your Zakāt payment is overdue — ${sym}${remaining.toFixed(2)} remaining`
          : `🌙 Your annual Zakāt is due soon — ${sym}${remaining.toFixed(2)}`;

        await sendEmail({ to: user.email, subject, html });

        console.log(`[ZakatReminders] ✓ Email sent to ${user.email} (daysSince=${daysSince}, remaining=${remaining})`);
        emailsSent++;
        results.push({ email: user.email, daysSince, remaining, currency, status: 'sent' });

      } catch (userErr) {
        console.error(`[ZakatReminders] Error for user ${user.email}:`, userErr.message);
        results.push({ email: user.email, status: 'error', error: userErr.message });
      }
    }

    console.log(`[ZakatReminders] Done. Sent=${emailsSent}, Skipped=${skipped}`);
    return Response.json({ success: true, emailsSent, skipped, results, checkedAt: todayStr });

  } catch (err) {
    console.error('[ZakatReminders] Fatal error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});