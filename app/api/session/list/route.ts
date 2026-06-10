import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import {
  hashSessionToken,
  listActiveSessionsForUser,
} from '@/lib/session-tracker';

function describeDevice(userAgent: string | null, fingerprint: string): string {
  if (!userAgent) return `Device ${fingerprint.slice(0, 8)}`;
  if (/iPhone|iPad/i.test(userAgent)) return 'Apple mobile';
  if (/Android/i.test(userAgent)) return 'Android device';
  if (/Macintosh/i.test(userAgent)) return 'Mac';
  if (/Windows/i.test(userAgent)) return 'Windows PC';
  if (/Linux/i.test(userAgent)) return 'Linux';
  return 'Web browser';
}

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const sessionToken = request.nextUrl.searchParams.get('sessionToken') || undefined;
  const currentHash = sessionToken ? hashSessionToken(sessionToken) : undefined;

  const sessions = await listActiveSessionsForUser(guard.user!.id, currentHash);

  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      label: describeDevice(s.user_agent, s.device_fingerprint),
      lastActive: s.last_active,
      createdAt: s.created_at,
      isCurrent: s.is_current ?? false,
    })),
  });
}
