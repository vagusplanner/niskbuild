import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { isPlatformOwner } from '@/lib/platform-owner-auth';

/** Lightweight owner check for nav UI — returns 200 for all signed-in users (no 401 spam). */
export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request, { rateLimit: 30 });
  if (!guard.ok) return guard.response;

  const owner = await isPlatformOwner();
  return NextResponse.json({ isOwner: owner, userId: owner ? guard.user!.id : undefined });
}
