import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { ENTERPRISE_SALES_EMAIL, PRICING_TIERS } from '@/lib/pricing-tiers';
import { sendEmail } from '@/lib/send-email';

const CONTACT_SALES_TIERS = new Set(
  PRICING_TIERS.filter((t) => t.contactSales).map((t) => t.tier)
);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { requireAuth: false, rateLimit: 5 });
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const plan = typeof body.plan === 'string' ? body.plan.trim() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const company = typeof body.company === 'string' ? body.company.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!CONTACT_SALES_TIERS.has(plan)) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Please enter your name' }, { status: 400 });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    if (!message || message.length < 10) {
      return NextResponse.json(
        { error: 'Please share a few details about your needs (at least 10 characters)' },
        { status: 400 }
      );
    }

    const tierMeta = PRICING_TIERS.find((t) => t.tier === plan);
    const planName = tierMeta?.name || plan;
    const planPrice = tierMeta?.price || '';
    const recipient = tierMeta?.contactEmail || ENTERPRISE_SALES_EMAIL;

    const subject = `Sales inquiry: ${planName} (${planPrice}/mo)`;
    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px;color:#111;">
        <h2 style="margin:0 0 16px;">New ${escapeHtml(planName)} inquiry</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:8px 0;color:#666;">Plan</td><td><strong>${escapeHtml(planName)}</strong> (${escapeHtml(planPrice)}/month)</td></tr>
          <tr><td style="padding:8px 0;color:#666;">Name</td><td>${escapeHtml(name)}</td></tr>
          <tr><td style="padding:8px 0;color:#666;">Email</td><td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
          ${company ? `<tr><td style="padding:8px 0;color:#666;">Company</td><td>${escapeHtml(company)}</td></tr>` : ''}
        </table>
        <h3 style="margin:24px 0 8px;font-size:14px;color:#666;">Message</h3>
        <p style="margin:0;white-space:pre-wrap;line-height:1.5;">${escapeHtml(message)}</p>
      </div>
    `;

    const sent = await sendEmail({
      to: recipient,
      subject,
      html,
      replyTo: email,
    });

    if (!sent) {
      return NextResponse.json(
        { error: 'Could not send your inquiry. Please try again shortly.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Thanks — our team will reach out within one business day.',
    });
  } catch (error) {
    console.error('Contact sales error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
