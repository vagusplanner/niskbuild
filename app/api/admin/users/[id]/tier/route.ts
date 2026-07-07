import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';
import { isAdminTierSlug, updateUserSubscriptionTier } from '@/lib/admin/update-user-tier';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const ownerGuard = await requirePlatformOwner(request);
  if (!ownerGuard.ok) return ownerGuard.response;

  try {
    const { id: userId } = await context.params;
    const body = await request.json();
    const tier = typeof body.tier === 'string' ? body.tier.trim() : '';

    if (!tier || !isAdminTierSlug(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    const result = await updateUserSubscriptionTier(userId, tier);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }

    return NextResponse.json({
      success: true,
      tier: result.tier,
      stripeSynced: result.stripeSynced,
      stripeWarning: result.stripeWarning ?? null,
    });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to update tier');
  }
}
