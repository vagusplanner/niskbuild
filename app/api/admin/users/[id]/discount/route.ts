import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { getAdminEmail } from '@/lib/admin-auth';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';
import { createAdminClient } from '@/lib/supabase/admin';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const ownerGuard = await requirePlatformOwner(request);
  if (!ownerGuard.ok) return ownerGuard.response;

  try {
    const { id: userId } = await context.params;
    const body = await request.json();
    const discountPercent = Math.min(
      100,
      Math.max(0, Math.round(Number(body.discountPercent) || 0))
    );
    const discountNote = typeof body.discountNote === 'string' ? body.discountNote.trim() : '';

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('profiles')
      .update({
        admin_discount_percent: discountPercent,
        admin_discount_note: discountNote || null,
        admin_discount_applied_at: discountPercent > 0 ? new Date().toISOString() : null,
        admin_discount_applied_by: discountPercent > 0 ? getAdminEmail() : null,
      })
      .eq('id', userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, discountPercent });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to update discount');
  }
}
