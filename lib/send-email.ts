import 'server-only';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  from?: string;
}

export function resolveEmailFrom(product: 'niskbuild' | 'vagus-planner' = 'niskbuild'): string {
  if (product === 'vagus-planner') {
    return (
      process.env.EMAIL_FROM_VP?.trim() ||
      'Vagus Planner <support@vagusplanner.com>'
    );
  }
  return process.env.EMAIL_FROM || 'NiskBuild <support@niskbuild.com>';
}

export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
  from: fromOverride,
}: SendEmailOptions): Promise<{ ok: boolean; id?: string; error?: string }> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from = fromOverride || process.env.EMAIL_FROM || 'NiskBuild <support@niskbuild.com>';

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
      const body = await res.text();
      console.error('Resend error:', body);
      let message = 'Resend rejected the email';
      try {
        const parsed = JSON.parse(body) as { message?: string };
        if (parsed.message) message = parsed.message;
      } catch {
        if (body) message = body.slice(0, 200);
      }
      return { ok: false, error: message };
    }

    const data = (await res.json()) as { id?: string };
    return { ok: true, id: data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Email send failed';
    console.error('Email send failed:', err);
    return { ok: false, error: message };
  }
}
