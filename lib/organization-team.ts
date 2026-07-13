import 'server-only';

import { randomBytes } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/send-email';
import { appUrl } from '@/lib/email/app-url';
import { EMAIL_TEMPLATE } from '@/lib/email/constants';
import { teamInviteHtml } from '@/lib/email/templates';
import { tierDisplayName, isAgencyStudioOrAbove } from '@/lib/tier-config';
import {
  getOrgSeatLimitForOwnerTier,
  listOrganizationsForUser,
  type OrgMemberRole,
  type OrganizationRow,
} from '@/lib/organizations';

export type InviteRole = 'admin' | 'member';

export type OrganizationInviteRow = {
  id: string;
  org_id: string;
  email: string;
  role: InviteRole;
  token: string;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export type SeatUsage = {
  used: number;
  limit: number;
  members: number;
  pendingInvites: number;
  remaining: number;
  atCapacity: boolean;
  /** True when member count alone exceeds the plan seat cap (soft overage after downgrade). */
  overCapacity: boolean;
  label: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function newInviteToken(): string {
  return `nbinv_${randomBytes(24).toString('hex')}`;
}

export function isPendingInvite(invite: {
  accepted_at: string | null;
  revoked_at: string | null;
  expires_at: string;
}): boolean {
  if (invite.accepted_at || invite.revoked_at) return false;
  return new Date(invite.expires_at).getTime() > Date.now();
}

export async function getMembership(
  orgId: string,
  userId: string
): Promise<{ role: OrgMemberRole } | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('organization_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { role: data.role as OrgMemberRole };
}

export async function requireOwnerOrAdmin(orgId: string, userId: string): Promise<OrgMemberRole> {
  const m = await getMembership(orgId, userId);
  if (!m || (m.role !== 'owner' && m.role !== 'admin')) {
    throw new Error('Only organization owners and admins can manage the team.');
  }
  return m.role;
}

export async function getOrgSeatUsage(orgId: string): Promise<SeatUsage> {
  const admin = createAdminClient();
  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .select('billing_owner_id')
    .eq('id', orgId)
    .maybeSingle();
  if (orgErr) throw new Error(orgErr.message);
  if (!org) throw new Error('Organization not found');

  const { data: owner, error: ownerErr } = await admin
    .from('profiles')
    .select('subscription_tier')
    .eq('id', org.billing_owner_id)
    .maybeSingle();
  if (ownerErr) throw new Error(ownerErr.message);

  const tier = (owner?.subscription_tier as string) || 'free';
  const limit = getOrgSeatLimitForOwnerTier(tier);

  const { count: memberCount, error: memErr } = await admin
    .from('organization_members')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId);
  if (memErr) throw new Error(memErr.message);

  const { data: invites, error: invErr } = await admin
    .from('organization_invites')
    .select('accepted_at, revoked_at, expires_at')
    .eq('org_id', orgId)
    .is('accepted_at', null)
    .is('revoked_at', null);
  if (invErr) throw new Error(invErr.message);

  const pendingInvites = (invites ?? []).filter(isPendingInvite).length;
  const members = memberCount ?? 0;
  const used = members + pendingInvites;
  const remaining = Math.max(0, limit - used);
  const atCapacity = used >= limit;
  const overCapacity = members > limit;
  const tierLabel = tierDisplayName(tier);

  return {
    used,
    limit,
    members,
    pendingInvites,
    remaining,
    atCapacity,
    overCapacity,
    label: overCapacity
      ? `${members} members on a ${tierLabel} plan capped at ${limit} — remove members or upgrade to invite again`
      : `${used} of ${limit >= 999999 ? 'unlimited' : limit} seats used${
          limit < 999999 ? ` (${tierLabel})` : ''
        }`,
  };
}

export async function getTeamDashboard(userId: string): Promise<{
  orgs: Array<
    OrganizationRow & {
      role: OrgMemberRole;
      seats: SeatUsage;
      teamsEligible: boolean;
      members: Array<{
        id: string;
        user_id: string;
        role: OrgMemberRole;
        joined_at: string;
        email: string | null;
        full_name: string | null;
      }>;
      invites: Array<{
        id: string;
        email: string;
        role: InviteRole;
        expires_at: string;
        created_at: string;
        pending: boolean;
      }>;
    }
  >;
}> {
  const orgs = await listOrganizationsForUser(userId);
  const admin = createAdminClient();
  const result = [];

  for (const org of orgs) {
    const seats = await getOrgSeatUsage(org.id);

    const { data: ownerProfile } = await admin
      .from('profiles')
      .select('subscription_tier, subscription_status')
      .eq('id', org.billing_owner_id)
      .maybeSingle();
    const teamsEligible = isAgencyStudioOrAbove(
      ownerProfile?.subscription_tier,
      ownerProfile?.subscription_status
    );

    const { data: members, error: memErr } = await admin
      .from('organization_members')
      .select('id, user_id, role, joined_at')
      .eq('org_id', org.id)
      .order('joined_at', { ascending: true });
    if (memErr) throw new Error(memErr.message);

    const userIds = (members ?? []).map((m) => m.user_id);
    const { data: profiles } = userIds.length
      ? await admin.from('profiles').select('id, email, full_name').in('id', userIds)
      : { data: [] };
    const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]));

    const { data: invites, error: invErr } = await admin
      .from('organization_invites')
      .select('id, email, role, expires_at, created_at, accepted_at, revoked_at')
      .eq('org_id', org.id)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .order('created_at', { ascending: false });
    if (invErr) throw new Error(invErr.message);

    result.push({
      ...org,
      seats,
      teamsEligible,
      members: (members ?? []).map((m) => {
        const p = profileById.get(m.user_id);
        return {
          id: m.id as string,
          user_id: m.user_id as string,
          role: m.role as OrgMemberRole,
          joined_at: m.joined_at as string,
          email: (p?.email as string) ?? null,
          full_name: (p?.full_name as string) ?? null,
        };
      }),
      invites: (invites ?? []).map((i) => ({
        id: i.id as string,
        email: i.email as string,
        role: i.role as InviteRole,
        expires_at: i.expires_at as string,
        created_at: i.created_at as string,
        pending: isPendingInvite(i as OrganizationInviteRow),
      })),
    });
  }

  return { orgs: result };
}

export async function createOrganizationInvite(params: {
  orgId: string;
  invitedBy: string;
  email: string;
  role: InviteRole;
}): Promise<{ invite: OrganizationInviteRow; seats: SeatUsage }> {
  await requireOwnerOrAdmin(params.orgId, params.invitedBy);

  const email = normalizeEmail(params.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Enter a valid email address.');
  }
  if (params.role !== 'admin' && params.role !== 'member') {
    throw new Error('Invite role must be admin or member.');
  }

  const admin = createAdminClient();
  const { data: orgRow } = await admin
    .from('organizations')
    .select('billing_owner_id')
    .eq('id', params.orgId)
    .maybeSingle();
  if (orgRow?.billing_owner_id) {
    const { data: ownerProfile } = await admin
      .from('profiles')
      .select('subscription_tier, subscription_status')
      .eq('id', orgRow.billing_owner_id)
      .maybeSingle();
    if (
      !isAgencyStudioOrAbove(
        ownerProfile?.subscription_tier,
        ownerProfile?.subscription_status
      )
    ) {
      throw new Error(
        'This team’s plan no longer includes multi-seat access. Restore Agency Studio or higher before inviting teammates.'
      );
    }
  }

  const seats = await getOrgSeatUsage(params.orgId);
  if (seats.overCapacity || seats.atCapacity) {
    throw new Error(
      seats.overCapacity
        ? `Seat overage (${seats.label}). Remove members until you are under the plan cap, or upgrade — existing members keep access. Need more seats? Additional seats are $39/month each — contact us at support@niskbuild.com to add more.`
        : `Seat limit reached (${seats.label}). Remove a member or revoke a pending invite before inviting someone else. Need more seats? Additional seats are $39/month each — contact us at support@niskbuild.com to add more.`
    );
  }

  const { data: existingMemberProfiles } = await admin
    .from('profiles')
    .select('id')
    .ilike('email', email)
    .limit(5);
  if (existingMemberProfiles?.length) {
    const ids = existingMemberProfiles.map((p) => p.id);
    const { data: already } = await admin
      .from('organization_members')
      .select('id')
      .eq('org_id', params.orgId)
      .in('user_id', ids)
      .limit(1);
    if (already?.length) throw new Error('That person is already a member of this team.');
  }

  const { data: pendingDup } = await admin
    .from('organization_invites')
    .select('id, accepted_at, revoked_at, expires_at')
    .eq('org_id', params.orgId)
    .ilike('email', email)
    .is('accepted_at', null)
    .is('revoked_at', null);
  if ((pendingDup ?? []).some(isPendingInvite)) {
    throw new Error('An invite is already pending for that email.');
  }

  const { data: org } = await admin
    .from('organizations')
    .select('name, billing_owner_id')
    .eq('id', params.orgId)
    .single();
  const { data: inviter } = await admin
    .from('profiles')
    .select('email, full_name')
    .eq('id', params.invitedBy)
    .maybeSingle();

  const token = newInviteToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: invite, error } = await admin
    .from('organization_invites')
    .insert({
      org_id: params.orgId,
      email,
      role: params.role,
      token,
      invited_by: params.invitedBy,
      expires_at: expiresAt,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  const inviterName =
    (inviter?.full_name as string)?.trim() ||
    (inviter?.email as string) ||
    'A teammate';
  const acceptUrl = appUrl(`/invite/${token}`);

  await sendEmail({
    to: email,
    subject: `Join ${org?.name || 'a team'} on NiskBuild`,
    html: teamInviteHtml({
      orgName: org?.name || 'your team',
      inviterName,
      role: params.role,
      acceptUrl,
      expiresAt,
    }),
  });

  // Best-effort send log (unique per invite so lifecycle dedupe does not block re-invites)
  try {
    await admin.from('email_sends').insert({
      user_id: params.invitedBy,
      template_key: `${EMAIL_TEMPLATE.TEAM_INVITE}_${invite.id}`,
      sent_at: new Date().toISOString(),
      subject: `Join ${org?.name || 'a team'} on NiskBuild`,
      source: 'system',
    });
  } catch {
    // optional log table columns may vary
  }

  return {
    invite: invite as OrganizationInviteRow,
    seats: await getOrgSeatUsage(params.orgId),
  };
}

export async function revokeOrganizationInvite(params: {
  orgId: string;
  inviteId: string;
  actorId: string;
}): Promise<void> {
  await requireOwnerOrAdmin(params.orgId, params.actorId);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('organization_invites')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', params.inviteId)
    .eq('org_id', params.orgId)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .select('id')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Invite not found or already closed.');
}

export async function transferOrganizationOwnership(params: {
  orgId: string;
  actorId: string;
  newOwnerUserId: string;
}): Promise<void> {
  if (params.actorId === params.newOwnerUserId) {
    throw new Error('Choose a different member to receive ownership.');
  }

  const admin = createAdminClient();

  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .select('id, billing_owner_id, name')
    .eq('id', params.orgId)
    .maybeSingle();
  if (orgErr) throw new Error(orgErr.message);
  if (!org) throw new Error('Organization not found.');
  if (org.billing_owner_id !== params.actorId) {
    throw new Error('Only the organization billing owner can transfer ownership.');
  }

  const { data: target, error: targetErr } = await admin
    .from('organization_members')
    .select('role')
    .eq('org_id', params.orgId)
    .eq('user_id', params.newOwnerUserId)
    .maybeSingle();
  if (targetErr) throw new Error(targetErr.message);
  if (!target) {
    throw new Error('The new owner must already be a member of this organization.');
  }

  const { data: actorProfile, error: actorProfErr } = await admin
    .from('profiles')
    .select(
      'subscription_tier, subscription_status, subscription_id, stripe_customer_id, cloud_credits_remaining'
    )
    .eq('id', params.actorId)
    .maybeSingle();
  if (actorProfErr) throw new Error(actorProfErr.message);

  // Promote new owner first (unique one-owner-per-org index requires demoting actor).
  const { error: demoteErr } = await admin
    .from('organization_members')
    .update({ role: 'admin' })
    .eq('org_id', params.orgId)
    .eq('user_id', params.actorId);
  if (demoteErr) throw new Error(demoteErr.message);

  const { error: promoteErr } = await admin
    .from('organization_members')
    .update({ role: 'owner' })
    .eq('org_id', params.orgId)
    .eq('user_id', params.newOwnerUserId);
  if (promoteErr) {
    // Best-effort rollback of demotion
    await admin
      .from('organization_members')
      .update({ role: 'owner' })
      .eq('org_id', params.orgId)
      .eq('user_id', params.actorId);
    throw new Error(promoteErr.message);
  }

  const { error: orgUpdateErr } = await admin
    .from('organizations')
    .update({ billing_owner_id: params.newOwnerUserId })
    .eq('id', params.orgId);
  if (orgUpdateErr) {
    await admin
      .from('organization_members')
      .update({ role: 'owner' })
      .eq('org_id', params.orgId)
      .eq('user_id', params.actorId);
    await admin
      .from('organization_members')
      .update({ role: target.role })
      .eq('org_id', params.orgId)
      .eq('user_id', params.newOwnerUserId);
    throw new Error(orgUpdateErr.message);
  }

  // Move team plan billing onto the new owner's profile so the org stays funded.
  if (actorProfile) {
    const { error: newOwnerBillErr } = await admin
      .from('profiles')
      .update({
        subscription_tier: actorProfile.subscription_tier,
        subscription_status: actorProfile.subscription_status,
        subscription_id: actorProfile.subscription_id,
        stripe_customer_id: actorProfile.stripe_customer_id,
        cloud_credits_remaining: actorProfile.cloud_credits_remaining,
      })
      .eq('id', params.newOwnerUserId);
    if (newOwnerBillErr) {
      console.error('Ownership transfer: failed to move billing fields:', newOwnerBillErr);
      throw new Error(
        'Ownership role updated, but billing could not be moved to the new owner. Contact support before deleting your account.'
      );
    }

    const { error: clearActorErr } = await admin
      .from('profiles')
      .update({
        subscription_tier: 'free',
        subscription_status: 'inactive',
        subscription_id: null,
        stripe_customer_id: null,
        cloud_credits_remaining: 0,
      })
      .eq('id', params.actorId);
    if (clearActorErr) {
      console.error('Ownership transfer: failed to clear former owner billing:', clearActorErr);
    }
  }
}

export async function removeAllOtherOrganizationMembers(params: {
  orgId: string;
  actorId: string;
}): Promise<{ removedMembers: number; revokedInvites: number }> {
  const admin = createAdminClient();

  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .select('billing_owner_id')
    .eq('id', params.orgId)
    .maybeSingle();
  if (orgErr) throw new Error(orgErr.message);
  if (!org) throw new Error('Organization not found.');
  if (org.billing_owner_id !== params.actorId) {
    throw new Error('Only the organization billing owner can remove all other members.');
  }

  const { data: removed, error: remErr } = await admin
    .from('organization_members')
    .delete()
    .eq('org_id', params.orgId)
    .neq('user_id', params.actorId)
    .select('id');
  if (remErr) throw new Error(remErr.message);

  const { data: revoked, error: revErr } = await admin
    .from('organization_invites')
    .update({ revoked_at: new Date().toISOString() })
    .eq('org_id', params.orgId)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .select('id');
  if (revErr) throw new Error(revErr.message);

  return {
    removedMembers: removed?.length ?? 0,
    revokedInvites: revoked?.length ?? 0,
  };
}

export async function updateMemberRole(params: {
  orgId: string;
  memberUserId: string;
  actorId: string;
  role: 'admin' | 'member';
}): Promise<void> {
  await requireOwnerOrAdmin(params.orgId, params.actorId);
  if (params.memberUserId === params.actorId) {
    throw new Error('You cannot change your own role.');
  }

  const admin = createAdminClient();
  const { data: target, error } = await admin
    .from('organization_members')
    .select('role')
    .eq('org_id', params.orgId)
    .eq('user_id', params.memberUserId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!target) throw new Error('Member not found.');
  if (target.role === 'owner') {
    throw new Error(
      'Use Transfer ownership to change the organization owner — you cannot demote the owner via role update.'
    );
  }

  const { error: updErr } = await admin
    .from('organization_members')
    .update({ role: params.role })
    .eq('org_id', params.orgId)
    .eq('user_id', params.memberUserId);
  if (updErr) throw new Error(updErr.message);
}

export async function removeOrganizationMember(params: {
  orgId: string;
  memberUserId: string;
  actorId: string;
}): Promise<void> {
  await requireOwnerOrAdmin(params.orgId, params.actorId);
  if (params.memberUserId === params.actorId) {
    throw new Error('Owners/admins cannot remove themselves. Ask another admin, or contact support.');
  }

  const admin = createAdminClient();
  const { data: target, error } = await admin
    .from('organization_members')
    .select('role')
    .eq('org_id', params.orgId)
    .eq('user_id', params.memberUserId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!target) throw new Error('Member not found.');
  if (target.role === 'owner') {
    throw new Error('Cannot remove the organization owner.');
  }

  const { error: delErr } = await admin
    .from('organization_members')
    .delete()
    .eq('org_id', params.orgId)
    .eq('user_id', params.memberUserId);
  if (delErr) throw new Error(delErr.message);
}

export type InvitePreview =
  | {
      status: 'pending';
      orgName: string;
      role: InviteRole;
      email: string;
      expiresAt: string;
      inviterName: string | null;
    }
  | { status: 'expired'; orgName: string | null }
  | { status: 'revoked'; orgName: string | null }
  | { status: 'accepted'; orgName: string | null }
  | { status: 'not_found' };

export async function getInviteByToken(token: string): Promise<{
  preview: InvitePreview;
  invite: OrganizationInviteRow | null;
}> {
  const admin = createAdminClient();
  const { data: invite, error } = await admin
    .from('organization_invites')
    .select('*')
    .eq('token', token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!invite) return { preview: { status: 'not_found' }, invite: null };

  const row = invite as OrganizationInviteRow;
  const { data: org } = await admin
    .from('organizations')
    .select('name')
    .eq('id', row.org_id)
    .maybeSingle();
  const orgName = (org?.name as string) || null;

  if (row.accepted_at) {
    return { preview: { status: 'accepted', orgName }, invite: row };
  }
  if (row.revoked_at) {
    return { preview: { status: 'revoked', orgName }, invite: row };
  }
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return { preview: { status: 'expired', orgName }, invite: row };
  }

  const { data: inviter } = await admin
    .from('profiles')
    .select('email, full_name')
    .eq('id', row.invited_by)
    .maybeSingle();

  return {
    preview: {
      status: 'pending',
      orgName: orgName || 'a team',
      role: row.role,
      email: row.email,
      expiresAt: row.expires_at,
      inviterName:
        (inviter?.full_name as string)?.trim() || (inviter?.email as string) || null,
    },
    invite: row,
  };
}

export async function acceptOrganizationInvite(params: {
  token: string;
  userId: string;
  userEmail: string | null | undefined;
}): Promise<{ orgId: string; orgName: string }> {
  const { preview, invite } = await getInviteByToken(params.token);
  if (!invite || preview.status === 'not_found') {
    throw new Error('This invite link is invalid.');
  }
  if (preview.status === 'expired') {
    throw new Error('This invite has expired. Ask your team admin to send a new one.');
  }
  if (preview.status === 'revoked') {
    throw new Error('This invite was revoked.');
  }
  if (preview.status === 'accepted') {
    throw new Error('This invite was already accepted.');
  }

  const accountEmail = normalizeEmail(params.userEmail || '');
  if (!accountEmail) {
    throw new Error('Sign in with the invited email address to accept.');
  }
  if (accountEmail !== normalizeEmail(invite.email)) {
    throw new Error(
      `This invite was sent to ${invite.email}. Sign in with that email (you are signed in as ${accountEmail}).`
    );
  }

  const seats = await getOrgSeatUsage(invite.org_id);
  // Accepting consumes a pending invite slot already counted in seats.used;
  // only block if members alone already at/over limit (edge: limit lowered).
  if (seats.members >= seats.limit) {
    throw new Error(
      `This team is at capacity (${seats.label}). Ask the owner to free a seat.`
    );
  }

  const admin = createAdminClient();
  const { data: orgForAccept } = await admin
    .from('organizations')
    .select('billing_owner_id, name')
    .eq('id', invite.org_id)
    .maybeSingle();
  if (orgForAccept?.billing_owner_id) {
    const { data: ownerProfile } = await admin
      .from('profiles')
      .select('subscription_tier, subscription_status')
      .eq('id', orgForAccept.billing_owner_id)
      .maybeSingle();
    if (
      !isAgencyStudioOrAbove(
        ownerProfile?.subscription_tier,
        ownerProfile?.subscription_status
      )
    ) {
      throw new Error(
        'This team’s plan no longer includes multi-seat access. Ask the owner to restore Agency Studio or higher before joining.'
      );
    }
  }

  const { data: existing } = await admin
    .from('organization_members')
    .select('id')
    .eq('org_id', invite.org_id)
    .eq('user_id', params.userId)
    .maybeSingle();

  if (!existing) {
    const { error: memErr } = await admin.from('organization_members').insert({
      org_id: invite.org_id,
      user_id: params.userId,
      role: invite.role,
    });
    if (memErr) throw new Error(memErr.message);
  }

  const { error: updErr } = await admin
    .from('organization_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id);
  if (updErr) throw new Error(updErr.message);

  return {
    orgId: invite.org_id,
    orgName: (orgForAccept?.name as string) || 'team',
  };
}

export async function userOrgIds(userId: string): Promise<string[]> {
  const orgs = await listOrganizationsForUser(userId);
  return orgs.map((o) => o.id);
}

export async function assertCanUseOrg(userId: string, orgId: string): Promise<void> {
  const m = await getMembership(orgId, userId);
  if (!m) throw new Error('You are not a member of that team.');
}

/**
 * Write access to org resources (create/move projects, invites already gated separately).
 * When Agency+ lapses: owner may still write; members are read-only.
 */
export async function assertCanWriteOrg(userId: string, orgId: string): Promise<void> {
  const m = await getMembership(orgId, userId);
  if (!m) throw new Error('You are not a member of that team.');

  const admin = createAdminClient();
  const { data: org } = await admin
    .from('organizations')
    .select('billing_owner_id')
    .eq('id', orgId)
    .maybeSingle();
  if (!org?.billing_owner_id) throw new Error('Organization not found');

  const { data: ownerProfile } = await admin
    .from('profiles')
    .select('subscription_tier, subscription_status')
    .eq('id', org.billing_owner_id)
    .maybeSingle();

  const eligible = isAgencyStudioOrAbove(
    ownerProfile?.subscription_tier,
    ownerProfile?.subscription_status
  );
  if (eligible) return;

  const isOwner =
    m.role === 'owner' || org.billing_owner_id === userId;
  if (!isOwner) {
    throw new Error(
      'This team’s plan no longer includes multi-seat access. You can still view team projects, but generation is paused. Ask the organization owner to restore an Agency Studio (or higher) plan.'
    );
  }
}
