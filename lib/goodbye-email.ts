import 'server-only';
import { sendEmail } from '@/lib/send-email';

export async function sendGoodbyeEmail(to: string): Promise<boolean> {
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;color:#e2e8f0;background:#0B0F19;padding:32px;border-radius:12px;">
      <h1 style="color:#4F6EF7;margin:0 0 16px;font-size:24px;">We're sorry to see you go</h1>
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 12px;">Your NiskBuild account has been permanently deleted.</p>
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 12px;">All your projects, data, and subscription have been removed.</p>
      <hr style="margin:24px 0;border:none;border-top:1px solid #1e293b;">
      <p style="color:#64748b;font-size:12px;margin:0;">If you change your mind, you're always welcome back at <a href="https://niskbuild.com" style="color:#22d3ee;">niskbuild.com</a>.</p>
    </div>
  `;

  return (await sendEmail({
    to,
    subject: 'Farewell from NiskBuild',
    html,
  })).ok;
}
