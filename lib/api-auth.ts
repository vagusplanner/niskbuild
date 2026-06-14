import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

export const RATE_LIMIT_MESSAGE =
  'Rate limit exceeded. Please wait before sending another request.';

/** Routes that intentionally skip session auth (still rate-limited) */
export const PUBLIC_API_PATHS = new Set([
  '/api/webhooks',
  '/api/waitlist',
  '/api/waitlist/count',
  '/api/contact-sales',
]);

export const RATE_LIMITS: Record<string, number> = {
  '/api/builder': 10,
  '/api/generate': 10,
  '/api/generate/game': 15,
  '/api/log-build': 30,
};

const DEFAULT_RATE_LIMIT = 60;

export function rateLimitExceededResponse(): NextResponse {
  return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function requireApiUser(
  request?: NextRequest
): Promise<
  { ok: true; user: User } | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!error && user) {
    return { ok: true, user };
  }

  if (request) {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
    if (token) {
      const {
        data: { user: bearerUser },
        error: bearerError,
      } = await supabase.auth.getUser(token);

      if (!bearerError && bearerUser) {
        return { ok: true, user: bearerUser };
      }
    }
  }

  return { ok: false, response: unauthorizedResponse() };
}

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export type ApiGuardResult =
  | { ok: true; user: User | null }
  | { ok: false; response: NextResponse };

/**
 * Auth + rate limit guard for API routes.
 * - webhooks: skip both (call separately)
 * - public paths: rate limit by IP only
 * - default: require session + rate limit by user id
 */
export async function guardApiRequest(
  request: NextRequest,
  options?: {
    requireAuth?: boolean;
    rateLimit?: number;
    rateLimitKey?: string;
    rateLimitWindowMs?: number;
  }
): Promise<ApiGuardResult> {
  const pathname = request.nextUrl.pathname;
  const isPublic = PUBLIC_API_PATHS.has(pathname);
  const requireAuth = options?.requireAuth ?? !isPublic;

  const maxRequests =
    options?.rateLimit ?? RATE_LIMITS[pathname] ?? DEFAULT_RATE_LIMIT;
  const windowMs = options?.rateLimitWindowMs ?? 60_000;

  if (requireAuth) {
    const auth = await requireApiUser(request);
    if (!auth.ok) return auth;

    const key = options?.rateLimitKey ?? `${pathname}:${auth.user.id}`;
    if (!checkRateLimit(key, maxRequests, windowMs)) {
      return { ok: false, response: rateLimitExceededResponse() };
    }

    return { ok: true, user: auth.user };
  }

  const key = options?.rateLimitKey ?? `${pathname}:${clientIp(request)}`;
  if (!checkRateLimit(key, maxRequests, windowMs)) {
    return { ok: false, response: rateLimitExceededResponse() };
  }

  return { ok: true, user: null };
}

/** B2B insights API — API key auth instead of Supabase session */
export async function guardInsightsApiKey(
  request: NextRequest
): Promise<ApiGuardResult> {
  const pathname = request.nextUrl.pathname;
  const apiKey = request.headers.get('x-insights-api-key');
  const expected = process.env.INSIGHTS_API_KEY;

  if (!expected || apiKey !== expected) {
    return { ok: false, response: unauthorizedResponse() };
  }

  const maxRequests = RATE_LIMITS[pathname] ?? DEFAULT_RATE_LIMIT;
  const key = `${pathname}:api-key`;
  if (!checkRateLimit(key, maxRequests)) {
    return { ok: false, response: rateLimitExceededResponse() };
  }

  return { ok: true, user: null };
}
