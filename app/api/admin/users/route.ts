import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const admin = createAdminClient();
    const { data: profiles, error } = await admin
      .from('profiles')
      .select(
        'id, email, subscription_tier, subscription_status, admin_discount_percent, admin_discount_note, created_at'
      )
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = profiles ?? [];
    const users = await Promise.all(
      rows.map(async (profile) => {
        const { count } = await admin
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id);
        return {
          ...profile,
          project_count: count ?? 0,
        };
      })
    );

    return NextResponse.json({ users });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to load users');
  }
}
