import { NextRequest, NextResponse } from 'next/server';

const SHIFT_AI_API_CORS_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const SHIFT_AI_API_CORS_HEADERS = 'Content-Type, Authorization';

/**
 * Recognized Shift AI SPA origins (local Vite, production host, Capacitor, Vercel).
 * Mirrors lib/vp-api-cors.ts — keep in sync when adding deploy hosts.
 */
export function isAllowedShiftAiApiOrigin(origin: string): boolean {
  const normalized = origin.trim();
  if (!normalized) return false;

  if (normalized === 'capacitor://localhost') return true;

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    return false;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

  const host = url.hostname.toLowerCase();
  const port = url.port;

  if (host === 'localhost' || host === '127.0.0.1') return true;
  if (host.endsWith('.vercel.app')) return true;

  if (host === 'niskbuild.com' || host.endsWith('.niskbuild.com')) return true;
  // Placeholder production SPA host (set when Shift AI ships its own domain)
  if (host === 'shift.niskbuild.com' || host === 'shiftai.app' || host.endsWith('.shiftai.app')) {
    return true;
  }

  for (const envKey of [
    'NEXT_PUBLIC_SHIFT_AI_URL',
    'NEXT_PUBLIC_APP_URL',
  ] as const) {
    const configured = process.env[envKey]?.trim();
    if (!configured) continue;
    try {
      const configuredUrl = new URL(configured);
      const configuredHost = configuredUrl.hostname.toLowerCase();
      const configuredPort = configuredUrl.port;
      if (host === configuredHost && port === configuredPort) return true;
      if (host === configuredHost && !configuredPort && !port) return true;
    } catch {
      // ignore invalid env URL
    }
  }

  return false;
}

export function resolveShiftAiApiCorsOrigin(request: NextRequest): string | null {
  const origin = request.headers.get('origin')?.trim();
  if (!origin || !isAllowedShiftAiApiOrigin(origin)) return null;
  return origin;
}

export function shiftAiApiCorsHeaderRecord(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': SHIFT_AI_API_CORS_METHODS,
    'Access-Control-Allow-Headers': SHIFT_AI_API_CORS_HEADERS,
    Vary: 'Origin',
  };
}

export function withShiftAiApiCors(request: NextRequest, response: NextResponse): NextResponse {
  const origin = resolveShiftAiApiCorsOrigin(request);
  if (!origin) return response;

  for (const [key, value] of Object.entries(shiftAiApiCorsHeaderRecord(origin))) {
    response.headers.set(key, value);
  }
  return response;
}

export function shiftAiApiCorsPreflightResponse(request: NextRequest): NextResponse {
  const origin = resolveShiftAiApiCorsOrigin(request);
  if (!origin) {
    return new NextResponse(null, { status: 403 });
  }

  return new NextResponse(null, {
    status: 204,
    headers: shiftAiApiCorsHeaderRecord(origin),
  });
}

export function shiftAiApiJson(
  request: NextRequest,
  body: unknown,
  init?: ResponseInit
): NextResponse {
  return withShiftAiApiCors(request, NextResponse.json(body, init));
}
