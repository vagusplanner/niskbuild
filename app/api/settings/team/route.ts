import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import { captureApiException } from '@/lib/api-error';
import {
  acceptOrganizationInvite,
  createOrganizationInvite,
  getTeamDashboard,
  removeOrganizationMember,
  revokeOrganizationInvite,
  updateMemberRole,
  type InviteRole,
} from '@/lib/organization-team';

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const { user } = await getAuthenticatedProfile();
    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const dashboard = await getTeamDashboard(user.id);
    return NextResponse.json({
      orgs: dashboard.orgs,
      hasTeamAccess: dashboard.orgs.length > 0,
    });
  } catch (error) {
    captureApiException(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load team' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const { user } = await getAuthenticatedProfile();
    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const body = await request.json();
    const action = body.action as string;
    const orgId = typeof body.orgId === 'string' ? body.orgId : '';

    if (!orgId) {
      return NextResponse.json({ error: 'orgId required' }, { status: 400 });
    }

    if (action === 'invite') {
      const email = typeof body.email === 'string' ? body.email : '';
      const role = (body.role === 'admin' ? 'admin' : 'member') as InviteRole;
      const result = await createOrganizationInvite({
        orgId,
        invitedBy: user.id,
        email,
        role,
      });
      return NextResponse.json({ invite: result.invite, seats: result.seats });
    }

    if (action === 'revoke_invite') {
      const inviteId = typeof body.inviteId === 'string' ? body.inviteId : '';
      await revokeOrganizationInvite({ orgId, inviteId, actorId: user.id });
      return NextResponse.json({ ok: true });
    }

    if (action === 'update_role') {
      const memberUserId = typeof body.memberUserId === 'string' ? body.memberUserId : '';
      const role = body.role === 'admin' ? 'admin' : 'member';
      await updateMemberRole({
        orgId,
        memberUserId,
        actorId: user.id,
        role,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === 'remove_member') {
      const memberUserId = typeof body.memberUserId === 'string' ? body.memberUserId : '';
      await removeOrganizationMember({
        orgId,
        memberUserId,
        actorId: user.id,
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    captureApiException(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Team action failed' },
      { status: 400 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  // Accept invite also exposed here for authenticated clients that prefer settings API
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const { user, profile } = await getAuthenticatedProfile();
    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const body = await request.json();
    if (body.action !== 'accept_invite') {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    const token = typeof body.token === 'string' ? body.token : '';
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
