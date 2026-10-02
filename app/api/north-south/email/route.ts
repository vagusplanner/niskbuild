import { NextRequest } from 'next/server';
import { captureApiException } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { resolveEmailFrom, sendEmail } from '@/lib/send-email';
import {
  nsApiCorsPreflightResponse,
  nsApiJson,
  withNsApiCors,
} from '@/lib/ns-api-cors';

export const maxDuration = 30;

const MAX_SUBJECT_CHARS = 500;
const MAX_BODY_CHARS = 50_000;

const DEFAULT_ALLOWLIST = [
  'contact@nsconsultd.com',
  'sofiane.kemih@gmail.com',
];

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

function looksLikeHtml(value: string): boolean {
  return /^\s*</.test(value) && /<\/?[a-z][\s\S]*>/i.test(value);
}

function resolveAllowlist(): Set<string> {
  const raw = process.env.NS_EMAIL_ALLOWLIST?.trim();
  const list = raw
    ? raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    : DEFAULT_ALLOWLIST;
  return new Set(list);
}

export async function OPTIONS(request: NextRequest) {
  return nsApiCorsPreflightResponse(request);
}

/**
 * POST /api/north-south/email
 * Contact / lead-magnet friendly: auth optional (IP rate-limited when public).
 * Unauthenticated recipients must be on NS_EMAIL_ALLOWLIST.
 */
export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { requireAuth: false, rateLimit: 8 });
  if (!guard.ok) return withNsApiCors(request, guard.response);

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return nsApiJson(request, { error: 'Invalid JSON body' }, { status: 400 });
    }

    const to = typeof body.to === 'string' ? body.to.trim() : '';
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const textOrHtml = typeof body.body === 'string' ? body.body.trim() : '';
    const replyTo =
      typeof body.replyTo === 'string' && body.replyTo.trim()
        ? body.replyTo.trim()
        : undefined;

    if (!to || !isValidEmail(to)) {
      return nsApiJson(request, { error: 'Valid recipient email (to) is required' }, { status: 400 });
    }

    if (!guard.user) {
      const allowlist = resolveAllowlist();
      if (!allowlist.has(to.toLowerCase())) {
        return nsApiJson(
          request,
          { error: 'Recipient is not allowed for public North South email' },
          { status: 403 }
        );
      }
    }

    if (!subject || subject.length < 2) {
      return nsApiJson(request, { error: 'subject is required' }, { status: 400 });
    }
    if (subject.length > MAX_SUBJECT_CHARS) {
      return nsApiJson(request, { error: 'subject is too long' }, { status: 400 });
    }
    if (!textOrHtml || textOrHtml.length < 2) {
      return nsApiJson(request, { error: 'body is required' }, { status: 400 });
    }
    if (textOrHtml.length > MAX_BODY_CHARS) {
      return nsApiJson(request, { error: 'body is too long' }, { status: 400 });
    }
    if (replyTo && !isValidEmail(replyTo)) {
      return nsApiJson(request, { error: 'replyTo must be a valid email' }, { status: 400 });
    }

    const html = looksLikeHtml(textOrHtml)
      ? textOrHtml
      : `<div style="font-family:system-ui,sans-serif;max-width:640px;line-height:1.5;color:#111;white-space:pre-wrap;">${escapeHtml(textOrHtml)}</div>`;

    const sendResult = await sendEmail({
      to,
      subject,
      html,
      replyTo,
      from: resolveEmailFrom('north-south'),
    });

    if (!sendResult.ok) {
      return nsApiJson(
        request,
        { error: sendResult.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    return nsApiJson(request, { success: true, id: sendResult.id });
  } catch (error) {
    captureApiException(error);
    const message = error instanceof Error ? error.message : 'Failed to send email';
    return nsApiJson(request, { error: message }, { status: 500 });
  }
}
