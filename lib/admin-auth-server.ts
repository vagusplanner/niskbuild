import 'server-only';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { guardApiRequest, unauthorizedResponse } from '@/lib/api-auth';
import { isAdminUser } from '@/lib/admin-auth';

export async function requireAdmin(
  request: NextRequest
): Promise<{ ok: true; user: User } | { ok: false; response: NextResponse }> {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard;
  if (!guard.user || !isAdminUser(guard.user)) {
    return { ok: false, response: unauthorizedResponse() };
  }
  return { ok: true, user: guard.user };
}
