import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  addCloudCredits,
  deductCloudCredit,
  deductCloudCredits,
} from '@/lib/credits';
import { getMembership } from '@/lib/organization-team';
import { isAgencyStudioOrAbove } from '@/lib/tier-access-server';
import { isProductGatingBypassActive } from '@/lib/platform-owner-bypass';

export type CreditChargeContext = {
  /** Profile that loses/gains credits */
  payerUserId: string;
  actingUserId: string;
  orgId: string | null;
  isOrgPool: boolean;
  billingOwnerId: string | null;
};

export const ORG_OUT_OF_CREDITS_MEMBER =
  'Your team is out of cloud credits. Contact the organization owner to reload credits or upgrade the team plan — you cannot upgrade this subscription yourself.';

export const ORG_TEAMS_LAPSED_MEMBER =
  'This team’s plan no longer includes multi-seat access. You can still view team projects, but generation is paused. Ask the organization owner to restore an Agency Studio (or higher) plan.';

export const ORG_TEAMS_LAPSED_OWNER =
  'Your plan no longer includes multi-seat teams. Team members have read-only access to org projects until you upgrade to Agency Studio or higher. Manage seats under Settings → Team.';

/**
 * Resolve who pays for a generation.
 * - Personal / no org project → acting user
 * - Org project → billing owner (shared pool), after membership + Agency+ checks
 */
export async function resolveCreditChargeContext(params: {
  actingUserId: string;
  projectId?: string | null;
  orgId?: string | null;
}): Promise<{ ok: true; context: CreditChargeContext } | { ok: false; error: string; status: number }> {
  const admin = createAdminClient();
  let orgId =
    typeof params.orgId === 'string' && params.orgId.trim() ? params.orgId.trim() : null;

  if (!orgId && params.projectId) {
    const { data: project, error } = await admin
      .from('projects')
      .select('org_id')
      .eq('id', params.projectId)
      .maybeSingle();
    if (error) {
      return { ok: false, error: error.message, status: 500 };
    }
    orgId = (project?.org_id as string) || null;
  }

  if (!orgId) {
    return {
      ok: true,
      context: {
        payerUserId: params.actingUserId,
        actingUserId: params.actingUserId,
        orgId: null,
        isOrgPool: false,
        billingOwnerId: null,
      },
    };
  }

  const membership = await getMembership(orgId, params.actingUserId);
  if (!membership) {
    return { ok: false, error: 'You are not a member of this team.', status: 403 };
  }

  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .select('billing_owner_id')
    .eq('id', orgId)
    .maybeSingle();
  if (orgErr) return { ok: false, error: orgErr.message, status: 500 };
  if (!org?.billing_owner_id) {
    return { ok: false, error: 'Organization not found', status: 404 };
  }

  const billingOwnerId = org.billing_owner_id as string;
  const { data: ownerProfile, error: ownerErr } = await admin
    .from('profiles')
    .select('subscription_tier, subscription_status')
    .eq('id', billingOwnerId)
    .maybeSingle();
  if (ownerErr) return { ok: false, error: ownerErr.message, status: 500 };

  const tier = (ownerProfile?.subscription_tier as string) || 'free';
  const status = (ownerProfile?.subscription_status as string) || 'inactive';
  const teamsEligible = isAgencyStudioOrAbove(tier, status);
  const isOwner =
    membership.role === 'owner' || billingOwnerId === params.actingUserId;

  // Product: when Agency+ lapses, non-owners are read-only on org projects;
  // the billing owner may still generate (debited from their own pool).
  if (!teamsEligible && !isOwner && !isProductGatingBypassActive()) {
    return {
      ok: false,
      error: ORG_TEAMS_LAPSED_MEMBER,
      status: 403,
    };
  }

  return {
    ok: true,
    context: {
      payerUserId: billingOwnerId,
      actingUserId: params.actingUserId,
      orgId,
      isOrgPool: true,
      billingOwnerId,
    },
  };
}

export async function deductCloudCreditForContext(
  context: CreditChargeContext
): Promise<{ ok: boolean; error?: string; remaining?: number }> {
  const result = await deductCloudCredit(context.payerUserId);
  if (
    !result.ok &&
    context.isOrgPool &&
    context.actingUserId !== context.payerUserId
  ) {
    return { ok: false, error: ORG_OUT_OF_CREDITS_MEMBER, remaining: result.remaining };
  }
  return result;
}

export async function deductCloudCreditsForContext(
  context: CreditChargeContext,
  amount: number
): Promise<{ ok: boolean; error?: string; remaining?: number }> {
  const result = await deductCloudCredits(context.payerUserId, amount);
  if (
    !result.ok &&
    context.isOrgPool &&
    context.actingUserId !== context.payerUserId
  ) {
    return { ok: false, error: ORG_OUT_OF_CREDITS_MEMBER, remaining: result.remaining };
  }
  return result;
}

export async function refundCloudCreditsForContext(
  context: CreditChargeContext,
  credits: number
): Promise<{ ok: boolean; remaining?: number }> {
  return addCloudCredits(context.payerUserId, credits);
}

/** True when org billing owner is still on an Agency+ active/past_due plan. */
export async function isOrgTeamsEligible(orgId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: org } = await admin
    .from('organizations')
    .select('billing_owner_id')
    .eq('id', orgId)
    .maybeSingle();
  if (!org?.billing_owner_id) return false;
  const { data: profile } = await admin
    .from('profiles')
    .select('subscription_tier, subscription_status')
    .eq('id', org.billing_owner_id)
    .maybeSingle();
  return isAgencyStudioOrAbove(
    profile?.subscription_tier,
    profile?.subscription_status
  );
}
