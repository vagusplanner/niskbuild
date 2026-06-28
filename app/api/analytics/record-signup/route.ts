import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { recordSignupIfNewUser, saveProfileDemographics } from '@/lib/usage-events';
import { clientIpFromHeaders } from '@/lib/coarse-town';
import { getClientLocale } from '@/lib/user-region';

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const locale =
    request.headers.get('accept-language')?.split(',')[0]?.trim() || getClientLocale();
  const clientIp = clientIpFromHeaders(request.headers);

  let body: { ageRange?: string; town?: string } = {};
  try {
    body = await request.json();
  } catch {
    /* optional body */
  }

  await saveProfileDemographics(guard.user!.id, {
    ageRange: body.ageRange || 'prefer not to say',
    town: body.town,
  });

  await recordSignupIfNewUser(guard.user!.id, { locale, clientIp });
  return NextResponse.json({ success: true });
}
