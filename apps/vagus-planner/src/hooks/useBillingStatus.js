/**
 * Server-authoritative billing snapshot for Account / Billing pages.
 * Same plan resolution as usePlanAccess / plan-access gating.
 */

import { useQuery } from '@tanstack/react-query';
import { getVpApiBaseUrl } from '@/lib/vp-env';
import {
  consumeVpApiSessionTimedOut,
  getVpApiFetchHeaders,
} from '@/api/base44Client';
import { iapDebugLog } from '@/lib/revenuecat';

const BILLING_STATUS_SESSION_TIMEOUT_MS = 4000;
const BILLING_STATUS_FETCH_TIMEOUT_MS = 10000;

async function fetchBillingStatus() {
  const apiBase = getVpApiBaseUrl();

  const headers = await getVpApiFetchHeaders({
    sessionTimeoutMs: BILLING_STATUS_SESSION_TIMEOUT_MS,
  });

  if (consumeVpApiSessionTimedOut()) {
    iapDebugLog('[billing-status] stage=session timed out');
    throw new Error('Could not load billing information');
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const fetchTimer = setTimeout(() => {
    try {
      controller?.abort();
    } catch {
      /* ignore */
    }
  }, BILLING_STATUS_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${apiBase}/api/vagus-planner/billing-status`, {
      credentials: 'include',
      headers,
      signal: controller?.signal,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Could not load billing status');
    }
    return res.json();
  } catch (err) {
    if (
      err?.name === 'AbortError' ||
      String(err?.message || '')
        .toLowerCase()
        .includes('aborted')
    ) {
      iapDebugLog('[billing-status] stage=fetch timed out');
      throw new Error('Could not load billing information');
    }
    throw err;
  } finally {
    clearTimeout(fetchTimer);
  }
}

export function useBillingStatus() {
  const query = useQuery({
    queryKey: ['billingStatus'],
    queryFn: fetchBillingStatus,
    staleTime: 15000,
    retry: 1,
  });

  const data = query.data ?? null;
  const subscription = data?.subscription ?? {
    plan: 'free',
    status: 'active',
  };
  const invoices = Array.isArray(data?.invoices) ? data.invoices : [];

  return {
    isLoading: query.isLoading,
    error: query.error,
    hasData: data != null,
    plan: data?.plan ?? subscription.plan ?? 'free',
    status: data?.status ?? subscription.status ?? 'active',
    source: data?.source ?? null,
    isPaid: data?.isPaid === true || data?.platformOwnerBypass === true,
    hasPaidIslamicAccess:
      data?.hasPaidIslamicAccess === true || data?.platformOwnerBypass === true,
    platformOwnerBypass: data?.platformOwnerBypass === true,
    subscription,
    invoices,
    refetch: query.refetch,
  };
}
