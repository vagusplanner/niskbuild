import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { countChurnRiskUsers, fetchChurnRiskUsers } from '@/lib/email/churn';
import { sendManualReengagementEmail } from '@/lib/email/lifecycle';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const users = await fetchChurnRiskUsers();
    return NextResponse.json({ count: users.length, users });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to load churn risk users');
  }
}

export async function POST(request: NextRequest) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const body = await request.json();
    const userId = typeof body.userId === 'string' ? body.userId : '';

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: profile, error } = await admin
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (error || !profile?.email) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const result = await sendManualReengagementEmail(userId, profile.email);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? 'Email could not be sent' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      warning: result.logWarning ?? null,
    });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to send re-engagement email');
  }
}
