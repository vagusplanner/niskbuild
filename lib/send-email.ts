import 'server-only';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
}: SendEmailOptions): Promise<{ ok: boolean; id?: string }> {
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'NiskBuild <support@niskbuild.com>';

  if (!resendKey) {
    console.log('📧 [dev email]', { to, subject });
    return { ok: true, id: `dev-${Date.now()}` };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    if (!res.ok) {
      console.error('Resend error:', await res.text());
      return { ok: false };
    }

    const data = (await res.json()) as { id?: string };
    return { ok: true, id: data.id };
  } catch (err) {
    console.error('Email send failed:', err);
    return { ok: false };
  }
}
