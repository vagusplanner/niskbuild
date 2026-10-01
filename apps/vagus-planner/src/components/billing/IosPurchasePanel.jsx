/**
 * iOS-native purchase CTAs via RevenueCat (replaces "This is a premium feature").
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Zap, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';
import {
  canUseAppleIap,
  ensureRevenueCatReady,
  findPackageForPlan,
  purchasePackage,
} from '@/lib/revenuecat';
import {
  WEB_SUB_MANAGE_MESSAGE,
  isEqualOrHigherPlan,
  normalizePlanId,
} from '@/lib/vp-plan-rank';
import { useBillingStatus } from '@/hooks/useBillingStatus';
import { getVpApiFetchHeaders } from '@/api/base44Client';

function apiBase() {
  return (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
}

const DUAL_PURCHASE_CHECK_MS = 5000;

function stripeBlocksRequestedPlan(data, requestedPlan) {
  if (!data) return false;
  const sub = data?.subscription;
  const provider = String(sub?.provider || '').toLowerCase();
  const plan = normalizePlanId(data?.plan || sub?.plan || 'free');
  const status = String(sub?.status || data?.status || '').toLowerCase();
  const entitled = ['active', 'trialing', 'past_due'].includes(status);
  const isStripe =
    provider === 'stripe' ||
    (!provider && Boolean(sub?.stripe_subscription_id)) ||
    data?.source === 'profiles';
  return Boolean(
    entitled && plan && plan !== 'free' && isStripe && isEqualOrHigherPlan(plan, requestedPlan)
  );
}

/**
 * Soft dual-purchase guard. MUST NOT hang the IAP path — Cap devices can stall
 * forever on billing-status / getSession without ever reaching Purchases.purchasePackage.
 * Pass cachedStatus from useBillingStatus when available.
 */
export async function assertNoBlockingWebSub(requestedPlan, cachedStatus = null) {
  if (stripeBlocksRequestedPlan(cachedStatus, requestedPlan)) {
    throw new Error(WEB_SUB_MANAGE_MESSAGE);
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timedOut = false;
  let timer;

  const checkPromise = (async () => {
    try {
      const res = await fetch(`${apiBase()}/api/vagus-planner/billing-status`, {
        credentials: 'include',
        headers: await getVpApiFetchHeaders(),
        signal: controller?.signal,
      });
      if (timedOut) return 'skip';
      if (!res.ok) return 'ok';
      const data = await res.json();
      if (timedOut) return 'skip';
      if (stripeBlocksRequestedPlan(data, requestedPlan)) {
        throw new Error(WEB_SUB_MANAGE_MESSAGE);
      }
      return 'ok';
    } catch (err) {
      if (err instanceof Error && err.message === WEB_SUB_MANAGE_MESSAGE) throw err;
      if (timedOut) return 'skip';
      console.warn('[IAP] dual-purchase check skipped:', err?.message || err);
      return 'skip';
    }
  })();

  const timeoutPromise = new Promise((resolve) => {
    timer = setTimeout(() => {
      timedOut = true;
      try {
        controller?.abort();
      } catch {
        /* ignore */
      }
      resolve('timeout');
    }, DUAL_PURCHASE_CHECK_MS);
  });

  try {
    const outcome = await Promise.race([checkPromise, timeoutPromise]);
    if (outcome === 'timeout') {
      console.warn('[IAP] dual-purchase check timed out — continuing to App Store purchase');
    }
  } catch (err) {
    if (err instanceof Error && err.message === WEB_SUB_MANAGE_MESSAGE) throw err;
    console.warn('[IAP] dual-purchase check skipped:', err?.message || err);
  } finally {
    if (timer) clearTimeout(timer);
    // Swallow late rejections after timeout won the race (avoid unhandledrejection).
    void checkPromise.catch(() => {});
  }
}

/**
 * Compact upgrade button used inside gates.
 */
export function IosUpgradeButton({
  planId = 'pro',
  billingCycle = 'monthly',
  editionPreference = 'standard',
  label,
  className,
  size = 'sm',
  variant = 'default',
}) {
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  if (!canUseAppleIap()) return null;

  const onPurchase = async () => {
    setBusy(true);
    try {
      console.log('[IosUpgradeButton] purchase start', { planId, billingCycle });
      await assertNoBlockingWebSub(planId);
      await ensureRevenueCatReady();
      const { pkg, error } = await findPackageForPlan({
        planId,
        billingCycle,
        editionPreference: planId.includes('islamic') ? 'islamic' : editionPreference,
      });
      if (error || !pkg) {
        console.error('[IosUpgradeButton] no package', { planId, billingCycle, error });
        toast.error(error || 'No App Store package found for this plan');
        navigate(createPageUrl('Billing'));
        return;
      }
      await purchasePackage(pkg);
      toast.success('Purchase successful — unlocking…');
      queryClient.invalidateQueries({ queryKey: ['billingStatus'] });
      queryClient.invalidateQueries({ queryKey: ['planAccess'] });
      queryClient.invalidateQueries({ queryKey: ['islamicAccess'] });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['billingStatus'] });
        queryClient.invalidateQueries({ queryKey: ['planAccess'] });
      }, 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/cancel|cancelled|PURCHASE_CANCELLED/i.test(msg)) {
        toast.info('Purchase cancelled');
      } else if (msg === WEB_SUB_MANAGE_MESSAGE) {
        toast.error(WEB_SUB_MANAGE_MESSAGE);
      } else {
        console.error('[IosUpgradeButton] purchase failed:', err);
        toast.error(msg || 'Purchase failed');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      size={size}
      variant={variant}
      className={cn(className)}
      disabled={busy}
      onClick={() => void onPurchase()}
    >
      {busy ? (
        <>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          Purchasing…
        </>
      ) : (
        <>
          <Zap className="w-3.5 h-3.5 mr-1.5" />
          {label || `Upgrade to ${planId.replace(/_/g, ' ')}`}
        </>
      )}
    </Button>
  );
}

/**
 * Inline notice + CTA for locked features on iOS.
 */
export default function IosPurchasePanel({
  className,
  compact = false,
  requiredPlan = 'Pro',
  feature,
  description,
  editionPreference = 'standard',
}) {
  const navigate = useNavigate();
  const planId = normalizePlanId(requiredPlan) || 'pro';
  const islamic = editionPreference === 'islamic' || planId.includes('islamic');

  if (!canUseAppleIap()) {
    return (
      <p className={cn('text-sm text-slate-600 dark:text-slate-300', className)}>
        This is a premium feature.
      </p>
    );
  }

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2 flex-wrap', className)}>
        <p className="text-xs text-slate-600 dark:text-slate-300 flex-1 min-w-0">
          {feature
            ? `${feature} requires ${requiredPlan}`
            : `Upgrade to ${requiredPlan} to unlock.`}
        </p>
        <IosUpgradeButton
          planId={islamic && !planId.includes('islamic') ? `${planId}_islamic` : planId}
          editionPreference={islamic ? 'islamic' : 'standard'}
          label="Upgrade"
          size="sm"
          className="bg-teal-600 hover:bg-teal-700 text-white text-xs px-3 h-8"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/80 dark:bg-teal-950/30 px-4 py-3 space-y-3',
        className
      )}
      role="status"
    >
      <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
        {description ||
          (feature
            ? `Unlock ${feature} with an in-app subscription.`
            : 'Subscribe in the App Store to unlock premium features.')}
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <IosUpgradeButton
          planId={islamic && !planId.includes('islamic') ? 'basic_islamic' : planId === 'free' ? 'pro' : planId}
          editionPreference={islamic ? 'islamic' : 'standard'}
          label={`Upgrade to ${requiredPlan}`}
          className="bg-teal-600 hover:bg-teal-700 text-white w-full sm:w-auto"
        />
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => navigate(createPageUrl('Billing'))}
        >
          View plans
        </Button>
      </div>
    </div>
  );
}

/**
 * Restore Purchases control for Billing (iOS only).
 */
export function IosRestorePurchasesButton({ className }) {
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  const { refetch } = useBillingStatus();

  if (!canUseAppleIap()) return null;

  const onRestore = async () => {
    setBusy(true);
    try {
      const { restorePurchases } = await import('@/lib/revenuecat');
      await restorePurchases();
      toast.success('Purchases restored — refreshing access…');
      await queryClient.invalidateQueries({ queryKey: ['billingStatus'] });
      await queryClient.invalidateQueries({ queryKey: ['planAccess'] });
      await queryClient.invalidateQueries({ queryKey: ['islamicAccess'] });
      await refetch?.();
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['billingStatus'] });
        queryClient.invalidateQueries({ queryKey: ['planAccess'] });
      }, 2500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Restore failed';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant="outline"
      className={cn('gap-2', className)}
      disabled={busy}
      onClick={() => void onRestore()}
    >
      <RefreshCw className={cn('w-4 h-4', busy && 'animate-spin')} />
      {busy ? 'Restoring…' : 'Restore Purchases'}
    </Button>
  );
}
