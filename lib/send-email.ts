import 'server-only';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'NiskBuild <billing@niskbuild.com>';

  if (!resendKey) {
    console.log('📧 [dev email]', { to, subject });
    return true;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!res.ok) {
      console.error('Resend error:', await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('Email send failed:', err);
    return false;
  }
}
