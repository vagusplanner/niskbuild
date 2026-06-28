import 'server-only';

import { sanitizeTown } from '@/lib/age-range';

/** Coarse city name from IP — never GPS or street-level data. */
export async function resolveCoarseTownFromIp(ip: string | null | undefined): Promise<string | null> {
  const trimmed = ip?.trim();
  if (!trimmed || trimmed === 'unknown' || trimmed === '::1' || trimmed.startsWith('127.')) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(trimmed)}?fields=status,city`,
      { signal: controller.signal, cache: 'no-store' }
    );
    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = (await response.json()) as { status?: string; city?: string };
    if (data.status !== 'success' || !data.city) return null;

    return sanitizeTown(data.city);
  } catch {
    return null;
  }
}

export function clientIpFromHeaders(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || headers.get('x-real-ip') || null;
}
