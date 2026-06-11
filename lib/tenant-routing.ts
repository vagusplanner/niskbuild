import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function getEdgeAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type TenantAppRecord = {
  id: string;
  owner_id: string;
  app_type: string;
  configuration_state: Record<string, unknown>;
  status: string;
};

const STATIC_EXT =
  /\.(svg|png|jpg|jpeg|gif|webp|xml|css|js|ico|woff2?|ttf|map)$/i;

export function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/:\d+$/, '');
}

/** Main NiskBuild app hosts — skip tenant resolution */
export function isBasePlatform(hostname: string): boolean {
  const host = normalizeHost(hostname);
  if (host === 'localhost') return true;
  if (host === 'niskbuild.com' || host === 'www.niskbuild.com') return true;
  if (host === 'preview.niskbuild.com') return true;
  if (host.endsWith('.vercel.app')) return true;
  return false;
}

export function shouldSkipTenantRouting(pathname: string): boolean {
  if (pathname.startsWith('/_next')) return true;
  if (pathname.startsWith('/api/internal')) return true;
  if (pathname.startsWith('/system/nodes-offline')) return true;
  if (pathname.startsWith('/app-runtime-engines')) return true;
  if (STATIC_EXT.test(pathname)) return true;
  return false;
}

export function extractSubdomainSlug(host: string): string | null {
  if (!host.endsWith('.niskbuild.com')) return null;
  const slug = host.replace(/\.niskbuild\.com$/, '');
  if (!slug || slug === 'www' || slug === 'preview' || slug === 'niskbuild') {
    return null;
  }
  return slug;
}

export async function resolveTenantByHostname(
  hostname: string
): Promise<TenantAppRecord | null> {
  const supabase = getEdgeAdminClient();
  if (!supabase) return null;

  const host = normalizeHost(hostname);
  const slug = extractSubdomainSlug(host);

  let query = supabase
    .from('compiled_applications')
    .select('id, owner_id, app_type, configuration_state, status');

  if (slug) {
    query = query.eq('subdomain_slug', slug);
  } else {
    query = query.eq('custom_production_domain', host);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error('Tenant lookup error:', error.message);
    return null;
  }

  return data as TenantAppRecord | null;
}
