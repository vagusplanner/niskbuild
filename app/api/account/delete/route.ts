import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { sendGoodbyeEmail } from '@/lib/goodbye-email';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { purgeVagusPlannerUserData } from '@/lib/vp-gdpr/purge-user-data';
import { purgeNiskBuildUserData } from '@/lib/nisk-gdpr/purge-user-data';
import {
  getOrgDeletionBlockers,
  ORG_CASCADE_CONFIRM_PHRASE,
} from '@/lib/org-deletion-blockers';

const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim();
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

async function cancelStripeSubscriptionForAccountDelete(
  subscriptionId: string,
  userId: string
): Promise<void> {
  if (!stripe) {
    throw new Error('Stripe is not configured — cannot cancel subscription before account delete');
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    if (subscription.status === 'canceled') {
      console.log(
        `Stripe subscription ${subscriptionId} already canceled for user ${userId} (account delete)`
      );
      return;
    }

    await stripe.subscriptions.cancel(subscriptionId);
    console.log(
      `Cancelled Stripe subscription ${subscriptionId} for user ${userId} (account delete)`
    );
  } catch (err) {
    if (err instanceof Stripe.errors.StripeInvalidRequestError && err.code === 'resource_missing') {
      console.log(
        `Stripe subscription ${subscriptionId} not found for user ${userId} — proceeding with account delete`
      );
      return;
    }
    throw err;
  }
}

/** Prefetch blockers for the Danger Zone UI. */
export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const blockers = await getOrgDeletionBlockers(guard.user!.id);
    return NextResponse.json({
      blocked: blockers.length > 0,
      blockers,
      cascadeConfirmPhrase: ORG_CASCADE_CONFIRM_PHRASE,
    });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to load account deletion status');
  }
}

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const supabase = await createClient();
    const user = guard.user!;
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email : '';
    const confirmOrgCascade = body.confirmOrgCascade === true;
    const orgCascadeConfirmText =
      typeof body.orgCascadeConfirmText === 'string' ? body.orgCascadeConfirmText.trim() : '';

    if (!email || email !== user.email) {
      return NextResponse.json(
        { error: 'Email confirmation required — type your account email to delete' },
        { status: 400 }
      );
    }

    const blockers = await getOrgDeletionBlockers(user.id);
    if (blockers.length > 0) {
      if (!confirmOrgCascade) {
        return NextResponse.json(
          {
            error:
              'You own one or more organizations that still have other members. Transfer ownership, remove other members, or explicitly confirm organization deletion.',
            code: 'ORG_OWNER_BLOCKED',
            blockers,
            cascadeConfirmPhrase: ORG_CASCADE_CONFIRM_PHRASE,
          },
          { status: 409 }
        );
      }
      if (orgCascadeConfirmText !== ORG_CASCADE_CONFIRM_PHRASE) {
        return NextResponse.json(
          {
            error: `Type ${ORG_CASCADE_CONFIRM_PHRASE} to confirm deleting your organizations and all members' org-scoped projects.`,
            code: 'ORG_CASCADE_CONFIRM_REQUIRED',
            cascadeConfirmPhrase: ORG_CASCADE_CONFIRM_PHRASE,
            blockers,
          },
          { status: 400 }
        );
      }
    }

    const userEmail = user.email;

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_id')
      .eq('id', user.id)
      .maybeSingle();

    const subscriptionId =
      typeof profile?.subscription_id === 'string' ? profile.subscription_id.trim() : '';

    if (subscriptionId) {
      try {
        await cancelStripeSubscriptionForAccountDelete(subscriptionId, user.id);
      } catch (err) {
        console.error('Stripe subscription cancel failed during account delete:', err);
        return NextResponse.json(
          {
            error:
              'Could not cancel your active subscription. Account was not deleted — update billing in Settings or contact support.',
          },
          { status: 502 }
        );
      }
    }

    // Immediate hard-delete (no grace period) — confirmed product decision.
    // Purge NiskBuild leftovers that would survive SET NULL / leave storage orphans.
    let niskPurge: Awaited<ReturnType<typeof purgeNiskBuildUserData>> | null = null;
    try {
      const adminForNisk = createAdminClient();
      if (!userEmail) {
        return NextResponse.json({ error: 'Account email is required' }, { status: 400 });
      }
      niskPurge = await purgeNiskBuildUserData(adminForNisk, {
        id: user.id,
        email: userEmail,
      });
      console.log('NiskBuild GDPR purge complete for', user.id, niskPurge);
    } catch (err) {
      console.error('NiskBuild GDPR purge failed during account delete:', err);
      return NextResponse.json(
        {
          error:
            'Could not delete account personal data. Account was not deleted — try again or contact support.',
        },
        { status: 502 }
      );
    }

    // Purge all firstparty.vp_* personal data + uploads BEFORE auth wipe.
    let vpPurge: Awaited<ReturnType<typeof purgeVagusPlannerUserData>> | null = null;
    try {
      const adminForVp = createAdminClient();
      vpPurge = await purgeVagusPlannerUserData(adminForVp, user.id);
      console.log('VP GDPR purge complete for', user.id, vpPurge);
    } catch (err) {
      console.error('VP GDPR purge failed during account delete:', err);
      return NextResponse.json(
        {
          error:
            'Could not delete Vagus Planner personal data. Account was not deleted — try again or contact support.',
        },
        { status: 502 }
      );
    }

    // Profile delete cascades organizations where this user is billing_owner_id.
    await supabase.from('projects').delete().eq('user_id', user.id);
    await supabase.from('profiles').delete().eq('id', user.id);

    try {
      const admin = createAdminClient();
      const { error: authError } = await admin.auth.admin.deleteUser(user.id);
      if (authError) {
        console.error('Auth user delete error:', authError);
        return NextResponse.json({
          partial: true,
          message: 'Projects and profile deleted. Contact support to complete account removal.',
        });
      }
    } catch {
      return NextResponse.json({
        partial: true,
        message: 'Projects and profile deleted. Contact support to complete account removal.',
      });
    }

    if (userEmail) {
      void sendGoodbyeEmail(userEmail).catch((err) => {
        console.error('Goodbye email failed:', err);
      });
    }

    return NextResponse.json({
      success: true,
      org_cascade: blockers.length > 0,
      nisk_purge: niskPurge,
      vp_purge: vpPurge,
    });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to delete account');
  }
}
