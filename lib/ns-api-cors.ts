import { NextRequest, NextResponse } from 'next/server';

const NS_API_CORS_METHODS = 'GET, POST, OPTIONS';
const NS_API_CORS_HEADERS = 'Content-Type, Authorization';

/** Recognized North South client origins (local Vite, production host, Vercel). */
export function isAllowedNsApiOrigin(origin: string): boolean {
  const normalized = origin.trim();
  if (!normalized) return false;

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
  if (host === 'nsconsultd.com' || host.endsWith('.nsconsultd.com')) return true;

  for (const envKey of ['NEXT_PUBLIC_NORTH_SOUTH_URL', 'NEXT_PUBLIC_APP_URL'] as const) {
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

export function resolveNsApiCorsOrigin(request: NextRequest): string | null {
  const origin = request.headers.get('origin')?.trim();
  if (!origin || !isAllowedNsApiOrigin(origin)) return null;
  return origin;
}

export function nsApiCorsHeaderRecord(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': NS_API_CORS_METHODS,
    'Access-Control-Allow-Headers': NS_API_CORS_HEADERS,
    Vary: 'Origin',
  };
}

export function withNsApiCors(request: NextRequest, response: NextResponse): NextResponse {
  const origin = resolveNsApiCorsOrigin(request);
  if (!origin) return response;

  for (const [key, value] of Object.entries(nsApiCorsHeaderRecord(origin))) {
    response.headers.set(key, value);
  }
  return response;
}

export function nsApiCorsPreflightResponse(request: NextRequest): NextResponse {
  const origin = resolveNsApiCorsOrigin(request);
  if (!origin) {
    return new NextResponse(null, { status: 403 });
  }

  return new NextResponse(null, {
    status: 204,
    headers: nsApiCorsHeaderRecord(origin),
  });
}

export function nsApiJson(
  request: NextRequest,
  body: unknown,
  init?: ResponseInit
): NextResponse {
  return withNsApiCors(request, NextResponse.json(body, init));
}
