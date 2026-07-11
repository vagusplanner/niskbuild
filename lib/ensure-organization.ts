import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { canUseWhiteLabelBranding, isAgencyStudioOrAbove } from '@/lib/tier-config';

/**
 * Ensure the user has a solo org as billing owner (Agency+ / White-Label+).
 * Mirrors organizations-agency-backfill.sql — idempotent.
 */
export async function ensureSoloOrganizationForUser(params: {
  userId: string;
  email?: string | null;
  tier?: string | null;
  status?: string | null;
}): Promise<{ orgId: string; created: boolean } | null> {
  const admin = createAdminClient();

  let tier = params.tier;
  let status = params.status;
  let email = params.email;

  if (tier == null || status == null || email == null) {
    const { data: profile } = await admin
      .from('profiles')
      .select('subscription_tier, subscription_status, email')
      .eq('id', params.userId)
      .maybeSingle();
    tier = tier ?? (profile?.subscription_tier as string) ?? 'free';
    status = status ?? (profile?.subscription_status as string) ?? 'inactive';
    email = email ?? (profile?.email as string) ?? null;
  }

  if (!isAgencyStudioOrAbove(tier, status)) {
    return null;
  }

  const { data: existing } = await admin
    .from('organizations')
    .select('id')
    .eq('billing_owner_id', params.userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return { orgId: existing.id as string, created: false };
  }

  const local =
    (email || '').split('@')[0]?.trim() ||
    'Personal';
  const orgName = `${local} workspace`;

  const insertRow: Record<string, unknown> = {
    name: orgName,
    billing_owner_id: params.userId,
  };
  if (canUseWhiteLabelBranding(tier, status)) {
    insertRow.hide_niskbuild_attribution = true;
  }

  const { data: created, error } = await admin
    .from('organizations')
    .insert(insertRow)
    .select('id')
    .single();

  if (error) {
    // Race: another request created the org
    const { data: raced } = await admin
      .from('organizations')
      .select('id')
      .eq('billing_owner_id', params.userId)
      .limit(1)
      .maybeSingle();
    if (raced?.id) return { orgId: raced.id as string, created: false };
    console.error('ensureSoloOrganizationForUser insert:', error.message);
    return null;
  }

  const orgId = created.id as string;
  const { error: memErr } = await admin.from('organization_members').insert({
    org_id: orgId,
    user_id: params.userId,
    role: 'owner',
  });
  if (memErr) {
    console.error('ensureSoloOrganizationForUser member:', memErr.message);
  }

  return { orgId, created: true };
}

/** Primary (oldest) org owned by this billing owner, if any. */
export async function getPrimaryOrgIdForBillingOwner(
  userId: string
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('organizations')
    .select('id')
    .eq('billing_owner_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data?.id as string) || null;
}
