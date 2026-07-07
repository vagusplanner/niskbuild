import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const email = request.nextUrl.searchParams.get('email')?.trim();
    if (!email) {
      return NextResponse.json({ error: 'email query parameter is required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('profiles')
      .select('id, email')
      .ilike('email', email)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ userId: data.id, email: data.email });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to look up user');
  }
}
