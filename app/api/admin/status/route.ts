import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { getAdminEmail } from '@/lib/admin-auth';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getPlatformStatusSnapshot,
  isPlatformStatusValue,
} from '@/lib/platform-status';

export async function GET(request: NextRequest) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    return NextResponse.json(await getPlatformStatusSnapshot());
  } catch (error) {
    return apiErrorResponse(error, 'Failed to load status');
  }
}

export async function PATCH(request: NextRequest) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const body = await request.json();
    if (!isPlatformStatusValue(body.status)) {
      return NextResponse.json(
        { error: 'status must be operational, degraded, or down' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const adminEmail = getAdminEmail(owner.user.email);
    const { error } = await admin.from('platform_status').upsert({
      id: 1,
      status: body.status,
      updated_at: new Date().toISOString(),
      updated_by: adminEmail,
    });
    if (error) throw new Error(error.message);

    return NextResponse.json(await getPlatformStatusSnapshot());
  } catch (error) {
    return apiErrorResponse(error, 'Failed to update status');
  }
}

export async function POST(request: NextRequest) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const body = await request.json();
    const text = typeof body.body === 'string' ? body.body.trim() : '';
    if (!text || text.length < 2) {
      return NextResponse.json({ error: 'Update text is required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const adminEmail = getAdminEmail(owner.user.email);
    const { error } = await admin.from('status_updates').insert({
      body: text.slice(0, 2000),
      created_by: adminEmail,
    });
    if (error) throw new Error(error.message);

    return NextResponse.json(await getPlatformStatusSnapshot());
  } catch (error) {
    return apiErrorResponse(error, 'Failed to post status update');
  }
}
