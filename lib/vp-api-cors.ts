import { NextRequest, NextResponse } from 'next/server';

const VP_API_CORS_METHODS = 'POST, OPTIONS';
const VP_API_CORS_HEADERS = 'Content-Type, Authorization';

/** Recognized VP client origins (preview deploys, production host, local dev, Capacitor). */
export function isAllowedVpApiOrigin(origin: string): boolean {
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

  for (const envKey of ['NEXT_PUBLIC_VAGUS_PLANNER_URL', 'NEXT_PUBLIC_APP_URL'] as const) {
    const configured = process.env[envKey]?.trim();
    if (!configured) continue;
    try {
      const configuredHost = new URL(configured).hostname.toLowerCase();
      const configuredPort = new URL(configured).port;
      if (host === configuredHost && port === configuredPort) return true;
      if (host === configuredHost && !configuredPort && !port) return true;
    } catch {
      // ignore invalid env URL
    }
  }

  return false;
}

/** Reflect a credentialed CORS origin when the request Origin is on the allowlist. */
export function resolveVpApiCorsOrigin(request: NextRequest): string | null {
  const origin = request.headers.get('origin')?.trim();
  if (!origin || !isAllowedVpApiOrigin(origin)) return null;
  return origin;
}

export function vpApiCorsHeaderRecord(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': VP_API_CORS_METHODS,
    'Access-Control-Allow-Headers': VP_API_CORS_HEADERS,
    Vary: 'Origin',
  };
}

export function withVpApiCors(request: NextRequest, response: NextResponse): NextResponse {
  const origin = resolveVpApiCorsOrigin(request);
  if (!origin) return response;

  for (const [key, value] of Object.entries(vpApiCorsHeaderRecord(origin))) {
    response.headers.set(key, value);
  }
  return response;
}

export function vpApiCorsPreflightResponse(request: NextRequest): NextResponse {
  const origin = resolveVpApiCorsOrigin(request);
  if (!origin) {
    return new NextResponse(null, { status: 403 });
  }

  return new NextResponse(null, {
    status: 204,
    headers: vpApiCorsHeaderRecord(origin),
  });
}

export function vpApiJson(
  request: NextRequest,
  body: unknown,
  init?: ResponseInit
): NextResponse {
  return withVpApiCors(request, NextResponse.json(body, init));
}
