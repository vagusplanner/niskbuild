import 'server-only';

function twilioAuthHeader(): string {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required');
  }
  return `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`;
}

function verifyServiceSid(): string {
  const sid = process.env.TWILIO_VERIFY_SID;
  if (!sid) {
    throw new Error('TWILIO_VERIFY_SID is required');
  }
  return sid;
}

export async function sendVerificationSms(e164Phone: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const serviceSid = verifyServiceSid();
    const body = new URLSearchParams({
      To: e164Phone.startsWith('+') ? e164Phone : `+${e164Phone}`,
      Channel: 'sms',
    });

    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`,
      {
        method: 'POST',
        headers: {
          Authorization: twilioAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error('Twilio Verify send error:', text);
      return { ok: false, error: 'Failed to send verification code' };
    }

    return { ok: true };
  } catch (err) {
    console.error('Twilio Verify send failed:', err);
    return { ok: false, error: 'SMS verification unavailable' };
  }
}

export async function checkVerificationCode(
  e164Phone: string,
  code: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const serviceSid = verifyServiceSid();
    const body = new URLSearchParams({
      To: e164Phone.startsWith('+') ? e164Phone : `+${e164Phone}`,
      Code: code.trim(),
    });

    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`,
      {
        method: 'POST',
        headers: {
          Authorization: twilioAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      }
    );

    const data = await res.json();

    if (!res.ok || data.status !== 'approved') {
      return { ok: false, error: 'Invalid or expired verification code' };
    }

    return { ok: true };
  } catch (err) {
    console.error('Twilio Verify check failed:', err);
    return { ok: false, error: 'Verification check failed' };
  }
}

export function isTwilioVerifyConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_VERIFY_SID
  );
}
