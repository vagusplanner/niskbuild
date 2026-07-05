import type { NextRequest } from 'next/server';

/** Forward session cookies to an internal NiskBuild API route from a VP function handler. */
export async function callInternalApi(
  request: NextRequest,
  path: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  const origin = request.nextUrl.origin;
  const res = await fetch(`${origin}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: request.headers.get('cookie') ?? '',
      Authorization: request.headers.get('authorization') ?? '',
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, json };
}

export function vpAppOrigin(request: NextRequest): string {
  const origin = request.headers.get('origin')?.trim();
  if (origin) return origin.replace(/\/$/, '');

  const referer = request.headers.get('referer')?.trim();
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      // ignore
    }
  }

  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5175').replace(/\/$/, '');
}
