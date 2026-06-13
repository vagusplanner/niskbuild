import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const supabase = await createClient();
    const user = guard.user!;
    const { email } = await request.json().catch(() => ({}));

    if (!email || email !== user.email) {
      return NextResponse.json(
        { error: 'Email confirmation required — type your account email to delete' },
        { status: 400 }
      );
    }

    await supabase.from('projects').delete().eq('user_id', user.id);
    await supabase.from('profiles').delete().eq('id', user.id);

    try {
      const admin = createAdminClient();
      const { error: authError } = await admin.auth.admin.deleteUser(user.id);
      if (authError) {
        console.error('Auth user delete error:', authError);
        return NextResponse.json({
          partial: true,
          message: 'Projects and profile deleted. Contact support to complete account removal.',
        });
      }
    } catch {
      return NextResponse.json({
        partial: true,
        message: 'Projects and profile deleted. Contact support to complete account removal.',
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to delete account');
  }
}
