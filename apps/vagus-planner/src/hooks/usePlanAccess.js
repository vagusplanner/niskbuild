import { useQuery } from '@tanstack/react-query';
import { getVpApiFetchHeaders } from '@/api/base44Client';

async function fetchPlanAccess() {
  const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const res = await fetch(`${apiBase}/api/vagus-planner/plan-access`, {
    credentials: 'include',
    headers: await getVpApiFetchHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Could not verify plan access');
  }
  return res.json();
}

/**
 * Server-authoritative plan + usage for UpgradeGate UX.
 * Enforcement still happens on VP functions / LLM routes.
 */
export function usePlanAccess() {
  const query = useQuery({
    queryKey: ['planAccess'],
    queryFn: fetchPlanAccess,
    staleTime: 30000,
    retry: 1,
  });

  const data = query.data ?? null;
  const usage = data?.usage ?? {};

  return {
    isLoading: query.isLoading,
    error: query.error,
    plan: data?.plan ?? 'free',
    isPaid: data?.isPaid === true,
    hasPaidIslamicAccess: data?.hasPaidIslamicAccess === true,
    platformOwnerBypass: data?.platformOwnerBypass === true,
    usage,
    aiCalendarSummary: usage.ai_calendar_summary ?? null,
    aiScheduler: usage.ai_scheduler ?? null,
    aiRequests: usage.ai_requests ?? null,
    refetch: query.refetch,
  };
}
