import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export type OrgDeletionBlocker = {
  orgId: string;
  orgName: string;
  otherMemberCount: number;
  members: Array<{
    userId: string;
    email: string | null;
    fullName: string | null;
    role: string;
  }>;
};

/**
 * Orgs where this user is billing owner AND at least one other member remains.
 * Solo-owned orgs (owner alone) do not block immediate account deletion.
 */
export async function getOrgDeletionBlockers(userId: string): Promise<OrgDeletionBlocker[]> {
  const admin = createAdminClient();

  const { data: orgs, error: orgErr } = await admin
    .from('organizations')
    .select('id, name')
    .eq('billing_owner_id', userId);
  if (orgErr) throw new Error(orgErr.message);
  if (!orgs?.length) return [];

  const blockers: OrgDeletionBlocker[] = [];

  for (const org of orgs) {
    const { data: members, error: memErr } = await admin
      .from('organization_members')
      .select('user_id, role')
      .eq('org_id', org.id);
    if (memErr) throw new Error(memErr.message);

    const others = (members ?? []).filter((m) => m.user_id !== userId);
    if (others.length === 0) continue;

    const userIds = others.map((m) => m.user_id as string);
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);
    const byId = new Map((profiles ?? []).map((p) => [p.id as string, p]));

    blockers.push({
      orgId: org.id as string,
      orgName: (org.name as string) || 'Organization',
      otherMemberCount: others.length,
      members: others.map((m) => {
        const p = byId.get(m.user_id as string);
        return {
          userId: m.user_id as string,
          email: (p?.email as string) ?? null,
          fullName: (p?.full_name as string) ?? null,
          role: m.role as string,
        };
      }),
    });
  }

  return blockers;
}

/** Phrase the user must type to authorize cascading org wipe with account delete. */
export const ORG_CASCADE_CONFIRM_PHRASE = 'DELETE ORGANIZATION';
