import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import { captureApiException } from '@/lib/api-error';
import { acceptOrganizationInvite, getInviteByToken } from '@/lib/organization-team';

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  // Public preview of invite status (no auth required for reading token validity)
  try {
    const { token } = await context.params;
    const { preview } = await getInviteByToken(token);
    return NextResponse.json({ preview });
  } catch (error) {
    captureApiException(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load invite' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const { user, profile } = await getAuthenticatedProfile();
    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const { token } = await context.params;
    const result = await acceptOrganizationInvite({
      token,
      userId: user.id,
      userEmail: profile?.email || user.email,
    });
    return NextResponse.json(result);
  } catch (error) {
    captureApiException(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not accept invite' },
      { status: 400 }
    );
  }
}
