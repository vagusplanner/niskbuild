import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { sendGoodbyeEmail } from '@/lib/goodbye-email';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const supabase = await createClient();
    const user = guard.user!;
    const { email } = await request.json().catch(() => ({}));

    if (!email || email !== user.email) {
      return NextResponse.json(
        { error: 'Email confirmation required — type your account email to delete' },
        { status: 400 }
      );
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

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error, 'Failed to delete account');
  }
}
