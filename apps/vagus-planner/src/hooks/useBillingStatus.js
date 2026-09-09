/**
 * Server-authoritative billing snapshot for Account / Billing pages.
 * Same plan resolution as usePlanAccess / plan-access gating.
 */

import { useQuery } from '@tanstack/react-query';
import { getVpApiFetchHeaders } from '@/api/base44Client';

async function fetchBillingStatus() {
  const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const res = await fetch(`${apiBase}/api/vagus-planner/billing-status`, {
    credentials: 'include',
    headers: await getVpApiFetchHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Could not load billing status');
  }
  return res.json();
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
