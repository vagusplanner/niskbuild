import 'server-only';

import { sendEmail } from '@/lib/send-email';

function shiftAiAppOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000'
  );
}

function consentLink(token: string): string {
  return `${shiftAiAppOrigin()}/builder/shift-ai/parent/consent/${encodeURIComponent(token)}`;
}

function parentDashboardLink(token: string): string {
  return `${shiftAiAppOrigin()}/builder/shift-ai/parent/${encodeURIComponent(token)}`;
}

function emailShell(body: string): string {
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.6;color:#111;max-width:560px;margin:0 auto;padding:24px">${body}</body></html>`;
}

export async function sendParentalConsentRequestEmail(options: {
  parentEmail: string;
  childFirstName: string;
  consentToken: string;
}): Promise<{ ok: boolean; error?: string }> {
  const link = consentLink(options.consentToken);
  const subject = `Action required: ${options.childFirstName} wants to join Shift AI`;

  const html = emailShell(`
    <h1 style="font-size:20px;margin:0 0 16px">Parental consent needed</h1>
    <p><strong>${options.childFirstName}</strong> has asked to use Shift AI — an AI study companion for ages 7–17 that adapts to UK, French, and US curricula.</p>
    <p>Before we can activate their account, we need your consent as their parent or guardian.</p>
    <p style="margin:28px 0">
      <a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">
        Review and give consent
      </a>
    </p>
    <p style="font-size:14px;color:#555">This link expires in <strong>72 hours</strong>. If you did not expect this email, you can ignore it — no account will be created without your approval.</p>
    <p style="font-size:12px;color:#888;margin-top:32px">Shift AI · Privacy-first learning. We collect coarse age bands and study progress only — never precise location or raw chat transcripts.</p>
  `);

  const result = await sendEmail({ to: options.parentEmail, subject, html });
  return { ok: result.ok, error: result.error };
}

export async function sendParentWelcomeAfterConsentEmail(options: {
  parentEmail: string;
  childFirstName: string;
  childLoginEmail: string;
  temporaryPassword: string;
  parentDashboardToken: string;
}): Promise<{ ok: boolean; error?: string }> {
  const dashboardUrl = parentDashboardLink(options.parentDashboardToken);
  const subject = `Welcome to Shift AI — ${options.childFirstName}'s account is ready`;

  const html = emailShell(`
    <h1 style="font-size:20px;margin:0 0 16px">${options.childFirstName}'s account is ready</h1>
    <p>Thank you for giving consent. Your child's Shift AI account is now active.</p>
    <h2 style="font-size:16px;margin:24px 0 8px">Your child's login details</h2>
    <p style="background:#f4f4f5;padding:16px;border-radius:8px;font-family:monospace;font-size:14px">
      Email: ${options.childLoginEmail}<br/>
      Temporary password: ${options.temporaryPassword}
    </p>
    <p style="font-size:14px;color:#555">Please ask your child to sign in and change this password as soon as possible.</p>
    <h2 style="font-size:16px;margin:24px 0 8px">Your parent dashboard</h2>
    <p>Use this private link to view your child's progress (bookmark it — it is unique to you):</p>
    <p style="margin:20px 0">
      <a href="${dashboardUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">
        Open parent dashboard
      </a>
    </p>
    <p style="font-size:12px;color:#888;margin-top:32px">Shift AI · Privacy-first learning</p>
  `);

  const result = await sendEmail({ to: options.parentEmail, subject, html });
  return { ok: result.ok, error: result.error };
}

export async function sendParentDeclineConfirmationEmail(options: {
  parentEmail: string;
  childFirstName: string;
}): Promise<{ ok: boolean; error?: string }> {
  const subject = `Confirmed: no Shift AI account was created for ${options.childFirstName}`;

  const html = emailShell(`
    <h1 style="font-size:20px;margin:0 0 16px">Consent declined</h1>
    <p>You declined parental consent for <strong>${options.childFirstName}</strong>.</p>
    <p>No Shift AI account has been created and no further action is required.</p>
    <p style="font-size:12px;color:#888;margin-top:32px">If this was a mistake, ask your child to start sign-up again from Shift AI.</p>
  `);

  const result = await sendEmail({ to: options.parentEmail, subject, html });
  return { ok: result.ok, error: result.error };
}
