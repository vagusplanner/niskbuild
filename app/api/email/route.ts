import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { sendEmail } from '@/lib/send-email';

const MAX_SUBJECT_CHARS = 500;
const MAX_BODY_CHARS = 20_000;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 12 });
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const to = typeof body.to === 'string' ? body.to.trim() : '';
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const textBody = typeof body.body === 'string' ? body.body.trim() : '';
    const replyTo =
      typeof body.replyTo === 'string' && body.replyTo.trim() ? body.replyTo.trim() : undefined;

    if (!to || !isValidEmail(to)) {
      return NextResponse.json({ error: 'Valid recipient email (to) is required' }, { status: 400 });
    }

    if (!subject || subject.length < 2) {
      return NextResponse.json({ error: 'subject is required' }, { status: 400 });
    }

    if (subject.length > MAX_SUBJECT_CHARS) {
      return NextResponse.json({ error: 'subject is too long' }, { status: 400 });
    }

    if (!textBody || textBody.length < 2) {
      return NextResponse.json({ error: 'body is required' }, { status: 400 });
    }

    if (textBody.length > MAX_BODY_CHARS) {
      return NextResponse.json({ error: 'body is too long' }, { status: 400 });
    }

    if (replyTo && !isValidEmail(replyTo)) {
      return NextResponse.json({ error: 'replyTo must be a valid email' }, { status: 400 });
    }

    const html = `<div style="font-family:system-ui,sans-serif;max-width:640px;line-height:1.5;color:#111;white-space:pre-wrap;">${escapeHtml(textBody)}</div>`;

    const sendResult = await sendEmail({
      to,
      subject,
      html,
      replyTo,
    });

    if (!sendResult.ok) {
      return NextResponse.json(
        { error: sendResult.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: sendResult.id });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to send email');
  }
}
