import 'server-only';
import { sendEmail } from '@/lib/send-email';

export async function sendNewLoginEmail(
  to: string,
  approveUrl: string,
  secureUrl: string
): Promise<boolean> {
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#e2e8f0;background:#0B0F19;padding:32px;border-radius:12px;">
      <h2 style="color:#fff;margin:0 0 12px;">New login detected on NiskBuild</h2>
      <p style="color:#94a3b8;line-height:1.6;">A new device tried to sign in to your account. Was this you?</p>
      <p style="margin:24px 0;">
        <a href="${approveUrl}" style="display:inline-block;background:linear-gradient(135deg,#4F6EF7,#7C3AED);color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Yes, this was me</a>
      </p>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;">
        If not, <a href="${secureUrl}" style="color:#22d3ee;">click here to secure your account</a> — we'll sign out all devices.
      </p>
      <p style="color:#64748b;font-size:12px;margin-top:32px;">This link expires in 1 hour.</p>
    </div>
  `;

  return sendEmail({
    to,
    subject: 'New login detected on NiskBuild',
    html,
  });
}
