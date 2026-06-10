import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasPaidTier } from '@/lib/access';
import { hashPhone, normalizePhone } from '@/lib/phone-hash';
import { isTwilioVerifyConfigured, sendVerificationSms } from '@/lib/twilio-verify';

const DUPLICATE_MESSAGE =
  'A free account already exists for this phone number. Sign in instead or upgrade for multi-account access.';

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 5 });
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  const userId = guard.user!.id;

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_status, phone_verified')
    .eq('id', userId)
    .single();

  const tier = profile?.subscription_tier ?? 'free';
  const paid = hasPaidTier(tier) && profile?.subscription_status === 'active';

  if (paid) {
    return NextResponse.json({
      success: true,
      skipped: true,
      message: 'Phone verification not required on paid plans.',
    });
  }

  if (profile?.phone_verified) {
    return NextResponse.json({ success: true, message: 'Phone already verified' });
  }

  const { phone } = await request.json();
  const normalized = normalizePhone(phone);

  if (normalized.length < 10) {
    return NextResponse.json({ error: 'Valid phone number required' }, { status: 400 });
  }

  const phoneHash = hashPhone(normalized);

  const { data: duplicate } = await supabase
    .from('profiles')
    .select('id')
    .eq('phone_hash', phoneHash)
    .neq('id', userId)
    .maybeSingle();

  if (duplicate) {
    return NextResponse.json({ error: DUPLICATE_MESSAGE }, { status: 409 });
  }

  const e164 = `+${normalized}`;

  if (isTwilioVerifyConfigured()) {
    const result = await sendVerificationSms(e164);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } else if (process.env.NODE_ENV === 'development') {
    console.log(`📱 [dev] Twilio Verify not configured — use code 000000 for +${normalized}`);
  } else {
    return NextResponse.json(
      { error: 'SMS verification not configured. Set TWILIO_VERIFY_SID.' },
      { status: 503 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Verification code sent via SMS',
  });
}
