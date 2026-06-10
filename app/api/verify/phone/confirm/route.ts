import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { hasPaidTier } from '@/lib/access';
import { hashPhone, normalizePhone } from '@/lib/phone-hash';
import { checkVerificationCode, isTwilioVerifyConfigured } from '@/lib/twilio-verify';

const DUPLICATE_MESSAGE =
  'A free account already exists for this phone number. Sign in instead or upgrade for multi-account access.';

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 10 });
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  const userId = guard.user!.id;

  const { code, phone } = await request.json();
  if (!code) {
    return NextResponse.json({ error: 'Code required' }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_status, phone_hash, phone_verified')
    .eq('id', userId)
    .single();

  const tier = profile?.subscription_tier ?? 'free';
  const paid = hasPaidTier(tier) && profile?.subscription_status === 'active';

  if (paid || profile?.phone_verified) {
    return NextResponse.json({ success: true, phoneVerified: true });
  }

  const normalized = phone ? normalizePhone(phone) : null;
  if (!normalized || normalized.length < 10) {
    return NextResponse.json({ error: 'Phone number required to verify code' }, { status: 400 });
  }

  if (isTwilioVerifyConfigured()) {
    const check = await checkVerificationCode(`+${normalized}`, String(code));
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }
  } else if (process.env.NODE_ENV === 'development' && String(code).trim() !== '000000') {
    return NextResponse.json({ error: 'Invalid code (dev: use 000000)' }, { status: 400 });
  } else if (!isTwilioVerifyConfigured()) {
    return NextResponse.json({ error: 'Verification service unavailable' }, { status: 503 });
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

  await supabase
    .from('profiles')
    .update({ phone_verified: true, phone_hash: phoneHash })
    .eq('id', userId);

  return NextResponse.json({ success: true, phoneVerified: true });
}
