/**
 * Ask the NiskBuild API to create public.profiles for this VP auth user if missing.
 * Fire-and-forget safe: failures are logged; checkout also re-ensures server-side.
 */

import { getVpApiFetchHeaders } from '@/api/base44Client';
import { getVpApiBaseUrl } from '@/lib/vp-env';

let inFlight = null;
let lastOkUserId = null;

export async function ensureVpBillingProfile(userId) {
  if (!userId) return false;
  if (lastOkUserId === userId) return true;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const apiBase = getVpApiBaseUrl();
      const res = await fetch(`${apiBase}/api/vagus-planner/ensure-profile`, {
        method: 'POST',
        credentials: 'include',
        headers: await getVpApiFetchHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.warn(
          '[ensureVpBillingProfile] failed:',
          data.error || res.statusText || res.status
        );
        return false;
      }
      lastOkUserId = userId;
      return true;
    } catch (err) {
      console.warn('[ensureVpBillingProfile] network error:', err);
      return false;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}
