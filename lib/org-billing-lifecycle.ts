import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { appUrl } from '@/lib/email/app-url';
import { EMAIL_TEMPLATE } from '@/lib/email/constants';
import { sendLifecycleEmail } from '@/lib/email/send-log';
import {
  teamPlanLapsedHtml,
  teamSeatOverageHtml,
} from '@/lib/email/templates';
import { getOrgSeatUsage } from '@/lib/organization-team';
import { isAgencyStudioOrAbove, tierDisplayName } from '@/lib/tier-config';

/**
 * After a billing owner's Stripe tier/status changes: notify members if teams
 * access lapsed, and notify the owner if seat count exceeds the new cap.
 *
 * Product policy (Phase 3):
 * - Soft seat overage: existing members kept; invites blocked until under cap.
 * - Lapsed Agency+: non-owner members keep view access; generation/writes gated
 *   at API time (read-only). No automatic member removal.
 */
export async function notifyOrgsAfterBillingOwnerPlanChange(params: {
  ownerId: string;
  ownerEmail: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { data: ownerProfile } = await admin
    .from('profiles')
    .select('subscription_tier, subscription_status, full_name, email')
    .eq('id', params.ownerId)
    .maybeSingle();

  const tier = (ownerProfile?.subscription_tier as string) || 'free';
  const status = (ownerProfile?.subscription_status as string) || 'inactive';
  const teamsEligible = isAgencyStudioOrAbove(tier, status);
  const ownerName =
    (ownerProfile?.full_name as string)?.trim() ||
    (ownerProfile?.email as string) ||
    params.ownerEmail;

  const { data: orgs } = await admin
    .from('organizations')
    .select('id, name')
    .eq('billing_owner_id', params.ownerId);

  for (const org of orgs ?? []) {
    const orgId = org.id as string;
    const orgName = (org.name as string) || 'your team';

    if (teamsEligible) {
      // Allow a future lapse to re-notify (clear prior once-per-org keys)
      try {
        await admin
          .from('email_sends')
          .delete()
          .like('template_key', `${EMAIL_TEMPLATE.TEAM_PLAN_LAPSED}_${orgId}%`);
      } catch {
        // best-effort; email_sends schema may vary
      }
    }

    const seats = await getOrgSeatUsage(orgId);
    if (seats.members > seats.limit) {
      await sendLifecycleEmail({
        userId: params.ownerId,
        to: params.ownerEmail,
        templateKey: `${EMAIL_TEMPLATE.TEAM_SEAT_OVERAGE}_${orgId}_${seats.limit}`,
        subject: `${orgName}: seat limit exceeded after plan change`,
        html: teamSeatOverageHtml({
          orgName,
          members: seats.members,
          limit: seats.limit,
          tierName: tierDisplayName(tier),
          settingsUrl: appUrl('/dashboard/settings?tab=team'),
        }),
        source: 'system',
      }).catch(() => {});
    }

    if (teamsEligible) continue;

    const { data: members } = await admin
      .from('organization_members')
      .select('user_id, role')
      .eq('org_id', orgId);

    for (const m of members ?? []) {
      if (m.role === 'owner' || m.user_id === params.ownerId) continue;
      const { data: memberProfile } = await admin
        .from('profiles')
        .select('email')
        .eq('id', m.user_id)
        .maybeSingle();
      const to = memberProfile?.email as string | undefined;
      if (!to) continue;

      await sendLifecycleEmail({
        userId: m.user_id as string,
        to,
        templateKey: `${EMAIL_TEMPLATE.TEAM_PLAN_LAPSED}_${orgId}`,
        subject: `${orgName}: team generation paused`,
        html: teamPlanLapsedHtml({
          orgName,
          ownerName,
          settingsUrl: appUrl('/dashboard/settings?tab=team'),
        }),
        source: 'system',
      }).catch(() => {});
    }
  }
}
