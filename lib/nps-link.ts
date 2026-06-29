import 'server-only';

import crypto from 'crypto';
import { appUrl } from '@/lib/email/app-url';

function npsSecret(): string {
  return (
    process.env.NPS_LINK_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    'niskbuild-nps-dev'
  );
}

export function signNpsLink(userId: string): string {
  return crypto.createHmac('sha256', npsSecret()).update(userId).digest('hex').slice(0, 20);
}

export function verifyNpsLink(userId: string, token: string | null | undefined): boolean {
  if (!userId || !token) return false;
  const expected = signNpsLink(userId);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}

export function npsScoreUrl(userId: string, score: number): string {
  const token = signNpsLink(userId);
  return appUrl(
    `/api/nps?score=${score}&user=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`
  );
}

export function npsPassiveFeedbackUrl(userId: string, token: string): string {
  return appUrl(
    `/nps/passive?user=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`
  );
}
