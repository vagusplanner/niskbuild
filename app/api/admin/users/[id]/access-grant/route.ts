import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmail } from '@/lib/admin-auth';
import {
  grantAdminCompedAccess,
  isAccessGrantTier,
  revokeAdminCompedAccess,
} from '@/lib/access-grant';
import { apiErrorResponse } from '@/lib/api-error';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Grant or revoke admin_comped access (DB-only — never touches Stripe).
 * POST { action: 'grant', tier, notes?, expiresAt? } | { action: 'revoke' }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const ownerGuard = await requirePlatformOwner(request);
  if (!ownerGuard.ok) return ownerGuard.response;

  try {
    const { id: userId } = await context.params;
    const body = await request.json();
    const action = typeof body.action === 'string' ? body.action.trim() : '';

    if (action === 'revoke') {
      const result = await revokeAdminCompedAccess(userId);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
      }
      return NextResponse.json({ success: true, access_grant: 'none' });
    }

    if (action !== 'grant') {
      return NextResponse.json(
        { error: 'action must be "grant" or "revoke"' },
        { status: 400 }
      );
    }

    const tier = typeof body.tier === 'string' ? body.tier.trim() : '';
    if (!isAccessGrantTier(tier)) {
      return NextResponse.json({ error: 'Invalid comped tier' }, { status: 400 });
    }

    const notes = typeof body.notes === 'string' ? body.notes : null;
    const expiresAt =
      typeof body.expiresAt === 'string' && body.expiresAt.trim()
        ? body.expiresAt.trim()
        : null;

    const result = await grantAdminCompedAccess({
      userId,
      tier,
      grantedBy: getAdminEmail(ownerGuard.user.email),
      notes,
      expiresAt,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }

    return NextResponse.json({
      success: true,
      access_grant: result.access_grant,
      tier: result.tier,
      expiresAt: result.expiresAt,
      stripeTouched: false,
    });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to update access grant');
  }
}
