import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { canUseWhiteLabelBranding } from '@/lib/tier-config';
import { isBasePlatform, normalizeHost } from '@/lib/tenant-routing';
import type { TenantBrand } from '@/lib/tenant-brand-types';

export type { TenantBrand } from '@/lib/tenant-brand-types';
export { tenantDisplayName } from '@/lib/tenant-brand-types';

function getEdgeAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Domain-scoped branding. Returns null on base platform hosts (niskbuild.com)
 * or when no custom domain is linked to an org.
 */
export async function resolveTenantBrand(
  hostname: string
): Promise<TenantBrand | null> {
  const host = normalizeHost(hostname);
  if (isBasePlatform(host)) return null;

  const supabase = getEdgeAdminClient();
  if (!supabase) return null;

  const { data: domain, error } = await supabase
    .from('custom_domains')
    .select('org_id, owner_id')
    .eq('hostname', host)
    .in('status', ['dns_verified', 'active'])
    .maybeSingle();

  if (error) {
    if (!/custom_domains|does not exist/i.test(error.message)) {
      console.error('resolveTenantBrand domain:', error.message);
    }
    return null;
  }
  if (!domain) return null;

  let orgId = (domain.org_id as string) || null;

  if (!orgId && domain.owner_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('billing_owner_id', domain.owner_id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    orgId = (org?.id as string) || null;
  }

  if (!orgId) return null;

  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .select(
      'id, name, brand_app_name, brand_logo_url, hide_niskbuild_attribution, billing_owner_id'
    )
    .eq('id', orgId)
    .maybeSingle();

  if (orgErr || !org) {
    if (orgErr) console.error('resolveTenantBrand org:', orgErr.message);
    return null;
  }

  const { data: owner } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_status')
    .eq('id', org.billing_owner_id)
    .maybeSingle();

  const ownerTier = (owner?.subscription_tier as string) || 'free';
  const ownerStatus = (owner?.subscription_status as string) || 'inactive';
  const wl = canUseWhiteLabelBranding(ownerTier, ownerStatus);

  // Option B + defense: only WL+ can hide; column must also be true
  const hideAttribution = wl && !!org.hide_niskbuild_attribution;

  const brandedName =
    typeof org.brand_app_name === 'string' && org.brand_app_name.trim()
      ? org.brand_app_name.trim()
      : null;
  const orgName =
    typeof org.name === 'string' && org.name.trim() ? org.name.trim() : null;
  const logoUrl =
    typeof org.brand_logo_url === 'string' && org.brand_logo_url.trim()
      ? org.brand_logo_url.trim()
      : null;

  return {
    orgId: org.id as string,
    appName: brandedName || orgName,
    logoUrl,
    hideAttribution,
    ownerTier,
    ownerStatus,
  };
}
