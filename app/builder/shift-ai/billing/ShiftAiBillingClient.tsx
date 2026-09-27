'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import ShiftAiSubscribePanel from '@/app/components/shift-ai/ShiftAiSubscribePanel';
import type { ShiftPlanAccess } from '@/lib/shift-ai/plan-access';
import { SA } from '@/lib/shift-ai/theme';
import { useShiftAiAppPath } from '@/lib/shift-ai/host-context';

type Props = {
  initialAccess: ShiftPlanAccess | null;
  defaultPlan?: 'student' | 'family';
  defaultChildQuantity?: number;
};

export default function ShiftAiBillingClient({
  initialAccess,
  defaultPlan = 'student',
  defaultChildQuantity = 0,
}: Props) {
  const searchParams = useSearchParams();
  const dashboardHref = useShiftAiAppPath('/dashboard');
  const billingHref = useShiftAiAppPath('/billing');
  const checkoutState = searchParams.get('checkout');
  const [access, setAccess] = useState<ShiftPlanAccess | null>(initialAccess);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const isPaid = Boolean(access?.isPaid && access.hasFullAccess);
  const isTrial = access?.plan === 'trial' && access.hasFullAccess;

  const statusLabel = useMemo(() => {
    if (!access) return 'Not signed in';
    if (access.platformOwnerBypass) return 'Platform owner (full access)';
    if (isPaid) return access.plan === 'family' ? 'Family (active)' : 'Student (active)';
    if (isTrial) return 'Free trial (full access)';
    return 'Free';
  }, [access, isPaid, isTrial]);

  useEffect(() => {
    if (checkoutState !== 'success') return;
    let cancelled = false;
    const refresh = async () => {
      setRefreshing(true);
      try {
        const res = await fetch('/api/shift-ai/plan-access', { credentials: 'include' });
        if (!res.ok) return;
        const data = (await res.json()) as ShiftPlanAccess;
        if (!cancelled) setAccess(data);
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    };
    void refresh();
    return () => {
      cancelled = true;
    };
  }, [checkoutState]);

  const openPortal = async () => {
    setPortalLoading(true);
    setPortalError(null);
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          returnUrl: `${window.location.origin}${billingHref}`,
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setPortalError(data.error || 'Could not open billing portal');
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      setPortalError(err instanceof Error ? err.message : 'Could not open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  if (!access) {
    return (
      <div className={SA.contentNarrow}>
        <h1 className={SA.heading}>Billing</h1>
        <p className={`mt-3 text-sm ${SA.muted}`}>
          Sign in to view your plan or subscribe to Student / Family.
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(billingHref)}`}
          className={`${SA.btnPrimary} mt-6 inline-flex`}
        >
          Sign in to subscribe
        </Link>
      </div>
    );
  }

  return (
    <div className={SA.contentNarrow}>
      <h1 className={SA.heading}>Billing</h1>
      <p className={`mt-2 text-sm ${SA.muted}`}>
        Manage your SuperEduc8 plan. Trial starts free; subscribe when you&apos;re ready to keep
        premium AI features.
      </p>

      {checkoutState === 'success' ? (
        <div className={`${SA.success} mt-4 flex items-start gap-2`}>
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            Checkout completed. {refreshing ? 'Refreshing your plan…' : 'Your subscription is updating.'}
          </span>
        </div>
      ) : null}
      {checkoutState === 'canceled' ? (
        <div className={`${SA.error} mt-4 flex items-start gap-2`}>
          <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>Checkout canceled — no charge was made. You can try again below.</span>
        </div>
      ) : null}

      <div className={`${SA.cardPadded} mt-6 space-y-2`}>
        <h2 className={`font-semibold ${SA.text}`}>Current plan</h2>
        <p className={`text-lg font-bold ${SA.text}`}>{statusLabel}</p>
        {access.trialEndsAt ? (
          <p className={`text-sm ${SA.muted}`} suppressHydrationWarning>
            Trial ends: {new Date(access.trialEndsAt).toISOString().slice(0, 10)}
          </p>
        ) : null}
        {access.currentPeriodEnd ? (
          <p className={`text-sm ${SA.muted}`} suppressHydrationWarning>
            Current period ends: {new Date(access.currentPeriodEnd).toISOString().slice(0, 10)}
          </p>
        ) : null}
        {access.childQuantity > 0 ? (
          <p className={`text-sm ${SA.muted}`}>Additional children: {access.childQuantity}</p>
        ) : null}
        {access.multiCurriculum ? (
          <p className={`text-sm ${SA.muted}`}>Multi-curriculum discount applied</p>
        ) : null}
      </div>

      {isPaid ? (
        <div className={`${SA.cardPadded} mt-4 space-y-3`}>
          <h2 className={`font-semibold ${SA.text}`}>Manage subscription</h2>
          <p className={`text-sm ${SA.muted}`}>
            Update payment method, cancel, or download invoices in the Stripe customer portal.
          </p>
          {portalError ? <div className={SA.error}>{portalError}</div> : null}
          <button
            type="button"
            onClick={() => void openPortal()}
            disabled={portalLoading}
            className={`${SA.btnSecondary} w-full`}
          >
            {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Open billing portal
          </button>
        </div>
      ) : (
        <div className={`${SA.cardPadded} mt-4`}>
          <h2 className={`mb-3 font-semibold ${SA.text}`}>
            {isTrial ? 'Subscribe after trial' : 'Upgrade to Student or Family'}
          </h2>
          <ShiftAiSubscribePanel
            defaultPlan={defaultPlan}
            defaultChildQuantity={defaultChildQuantity}
          />
        </div>
      )}

      <p className={`mt-6 text-center text-sm ${SA.muted}`}>
        <Link href={dashboardHref} className={SA.link}>
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
