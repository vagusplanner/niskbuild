import 'server-only';

import { randomBytes } from 'crypto';
import { promises as dns } from 'dns';
import { createAdminClient } from '@/lib/supabase/admin';
import { canUseCustomDomains } from '@/lib/tier-config';
import {
  attachDomainToVercelProject,
  getVercelDomainConfig,
  vercelDnsCnameTarget,
  vercelDomainEnvConfigured,
} from '@/lib/vercel-domains';

export type CustomDomainStatus = 'pending_dns' | 'dns_verified' | 'active' | 'failed';

/** Shown when TXT ownership is proven but traffic DNS / Vercel readiness is incomplete. */
export const OWNERSHIP_CONFIRMED_ADD_CNAME =
  'Ownership confirmed — add the CNAME record shown below to finish activation';

export type CustomDomainRow = {
  id: string;
  owner_id: string;
  hostname: string;
  verification_token: string;
  status: CustomDomainStatus;
  compiled_application_id: string | null;
  vercel_attached: boolean;
  last_error: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
};

export function normalizeCustomHostname(input: string): string {
  let host = input.trim().toLowerCase();
  host = host.replace(/^https?:\/\//, '');
  host = host.split('/')[0] ?? host;
  host = host.replace(/:\d+$/, '');
  host = host.replace(/\.$/, '');
  if (host.startsWith('www.')) {
    // Store apex-or-as-entered without forcing www strip for uniqueness clarity —
    // reject www alias as separate claim; user should enter the exact host they will CNAME.
  }
  return host;
}

export function isValidCustomHostname(hostname: string): boolean {
  if (!hostname || hostname.length > 253) return false;
  if (hostname === 'localhost') return false;
  if (hostname.endsWith('.niskbuild.com')) return false;
  if (hostname.endsWith('.vercel.app')) return false;
  if (!hostname.includes('.')) return false;
  // Basic DNS label check
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(hostname);
}

export function txtRecordHost(hostname: string): string {
  return `_niskbuild-challenge.${hostname}`;
}

export function dnsInstructions(hostname: string, token: string) {
  return {
    txtHost: txtRecordHost(hostname),
    txtType: 'TXT' as const,
    txtValue: token,
    cnameHost: hostname,
    cnameType: 'CNAME' as const,
    cnameTarget: vercelDnsCnameTarget(),
    notes: [
      'Add the TXT record first — NiskBuild verifies ownership with that value.',
      'Then point the hostname with a CNAME to the Vercel target so traffic and SSL can reach the app.',
      'DNS changes can take a few minutes (sometimes up to 24–48 hours).',
    ],
  };
}

function newVerificationToken(): string {
  return `nbverify_${randomBytes(16).toString('hex')}`;
}

export async function listCustomDomainsForOwner(ownerId: string): Promise<CustomDomainRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('custom_domains')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as CustomDomainRow[];
}

export async function listAllCustomDomainsForAdmin(): Promise<
  (CustomDomainRow & { owner_email?: string | null })[]
> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('custom_domains')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as CustomDomainRow[];
  const ownerIds = [...new Set(rows.map((r) => r.owner_id))];
  if (ownerIds.length === 0) return rows;

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email')
    .in('id', ownerIds);

  const emailById = new Map((profiles ?? []).map((p) => [p.id as string, p.email as string]));
  return rows.map((r) => ({ ...r, owner_email: emailById.get(r.owner_id) ?? null }));
}

async function ensureCompiledAppForDomain(
  ownerId: string,
  hostname: string
): Promise<string> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from('compiled_applications')
    .select('id, custom_production_domain')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(5);

  const withDomain = (existing ?? []).find((a) => a.custom_production_domain === hostname);
  if (withDomain) return withDomain.id as string;

  const anyApp = existing?.[0];
  if (anyApp) {
    await admin
      .from('compiled_applications')
      .update({ custom_production_domain: hostname, updated_at: new Date().toISOString() })
      .eq('id', anyApp.id);
    return anyApp.id as string;
  }

  // Pull latest project HTML if available for a usable runtime shell
  const { data: project } = await admin
    .from('projects')
    .select('title, generated_code')
    .eq('user_id', ownerId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const html =
    typeof project?.generated_code === 'string' && project.generated_code.trim()
      ? project.generated_code
      : `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${hostname}</title></head><body style="font-family:system-ui;padding:2rem"><h1>NiskBuild</h1><p>Custom domain <strong>${hostname}</strong> is connected. Publish an app from the builder to replace this placeholder.</p></body></html>`;

  const { data: created, error } = await admin
    .from('compiled_applications')
    .insert({
      owner_id: ownerId,
      app_type: 'webapp',
      custom_production_domain: hostname,
      status: 'active',
      configuration_state: {
        title: project?.title || hostname,
        html,
      },
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return created.id as string;
}

export async function claimCustomDomain(params: {
  ownerId: string;
  tier: string | null | undefined;
  status: string | null | undefined;
  hostnameInput: string;
}): Promise<{ domain: CustomDomainRow; instructions: ReturnType<typeof dnsInstructions> }> {
  if (!canUseCustomDomains(params.tier, params.status)) {
    throw new Error('Custom domains require an active White-Label, Team Enterprise, or Sovereign plan.');
  }

  const hostname = normalizeCustomHostname(params.hostnameInput);
  if (!isValidCustomHostname(hostname)) {
    throw new Error('Enter a valid hostname like app.yourcompany.com');
  }

  const admin = createAdminClient();
  const token = newVerificationToken();

  const { data, error } = await admin
    .from('custom_domains')
    .insert({
      owner_id: params.ownerId,
      hostname,
      verification_token: token,
      status: 'pending_dns',
      last_error: null,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('That domain is already registered. Remove it first or choose another.');
    }
    throw new Error(error.message);
  }

  const domain = data as CustomDomainRow;
  return { domain, instructions: dnsInstructions(hostname, token) };
}

/**
 * Real DNS TXT lookup — must find verification_token at _niskbuild-challenge.<host>
 */
export async function lookupTxtChallenge(hostname: string): Promise<string[]> {
  const name = txtRecordHost(hostname);
  try {
    const records = await dns.resolveTxt(name);
    return records.map((chunks) => chunks.join(''));
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENOTFOUND' || code === 'ENODATA' || code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

/**
 * Confirm the hostname has a traffic record (CNAME and/or A) — not ownership TXT alone.
 */
export async function lookupHostnameTrafficRecords(hostname: string): Promise<{
  cnames: string[];
  aRecords: string[];
  hasTrafficRecord: boolean;
}> {
  let cnames: string[] = [];
  let aRecords: string[] = [];

  try {
    cnames = await dns.resolveCname(hostname);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code !== 'ENOTFOUND' && code !== 'ENODATA' && code !== 'ENOENT') {
      throw err;
    }
  }

  try {
    aRecords = await dns.resolve4(hostname);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code !== 'ENOTFOUND' && code !== 'ENODATA' && code !== 'ENOENT') {
      throw err;
    }
  }

  return {
    cnames,
    aRecords,
    hasTrafficRecord: cnames.length > 0 || aRecords.length > 0,
  };
}

function emptyDnsLookupError(code: string | undefined): boolean {
  return code === 'ENOTFOUND' || code === 'ENODATA' || code === 'ENOENT';
}

export async function verifyCustomDomainDns(params: {
  ownerId: string;
  domainId: string;
  tier: string | null | undefined;
  status: string | null | undefined;
}): Promise<{
  domain: CustomDomainRow;
  vercel: Awaited<ReturnType<typeof attachDomainToVercelProject>>;
  vercelConfig: Awaited<ReturnType<typeof getVercelDomainConfig>>;
  trafficDns: Awaited<ReturnType<typeof lookupHostnameTrafficRecords>>;
  message: string;
  instructions: ReturnType<typeof dnsInstructions>;
}> {
  if (!canUseCustomDomains(params.tier, params.status)) {
    throw new Error('Custom domains require an active White-Label, Team Enterprise, or Sovereign plan.');
  }

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from('custom_domains')
    .select('*')
    .eq('id', params.domainId)
    .eq('owner_id', params.ownerId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) throw new Error('Domain not found');

  const domain = row as CustomDomainRow;
  let txtValues: string[] = [];
  try {
    txtValues = await lookupTxtChallenge(domain.hostname);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'DNS lookup failed';
    await admin
      .from('custom_domains')
      .update({ status: 'failed', last_error: message })
      .eq('id', domain.id);
    throw new Error(`DNS lookup failed: ${message}`);
  }

  const matched = txtValues.some((v) => v.trim() === domain.verification_token);
  if (!matched) {
    const msg = `TXT record not found (or value mismatch) at ${txtRecordHost(domain.hostname)}. Found: ${
      txtValues.length ? txtValues.join(' | ') : '(none)'
    }`;
    const { data: failed } = await admin
      .from('custom_domains')
      .update({ status: 'failed', last_error: msg })
      .eq('id', domain.id)
      .select('*')
      .single();
    return {
      domain: (failed ?? domain) as CustomDomainRow,
      vercel: {
        ok: true,
        attached: false,
        skipped: true,
        reason: 'DNS not verified yet',
      },
      vercelConfig: {
        ok: true,
        skipped: true,
        reason: 'DNS not verified yet',
      },
      trafficDns: { cnames: [], aRecords: [], hasTrafficRecord: false },
      message: msg,
      instructions: dnsInstructions(domain.hostname, domain.verification_token),
    };
  }

  const compiledId = await ensureCompiledAppForDomain(params.ownerId, domain.hostname);
  const vercel = await attachDomainToVercelProject(domain.hostname);

  let trafficDns: Awaited<ReturnType<typeof lookupHostnameTrafficRecords>> = {
    cnames: [],
    aRecords: [],
    hasTrafficRecord: false,
  };
  try {
    trafficDns = await lookupHostnameTrafficRecords(domain.hostname);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (!emptyDnsLookupError(code)) {
      const message = err instanceof Error ? err.message : 'Traffic DNS lookup failed';
      await admin
        .from('custom_domains')
        .update({
          status: 'dns_verified',
          compiled_application_id: compiledId,
          vercel_attached: Boolean(vercel.ok && 'attached' in vercel && vercel.attached),
          verified_at: new Date().toISOString(),
          last_error: message,
        })
        .eq('id', domain.id);
      throw new Error(`Traffic DNS lookup failed: ${message}`);
    }
  }

  const vercelConfig = await getVercelDomainConfig(domain.hostname);

  const vercelReady =
    vercelConfig.ok &&
    !('skipped' in vercelConfig && vercelConfig.skipped) &&
    'misconfigured' in vercelConfig &&
    vercelConfig.misconfigured === false;

  const vercelAttached = Boolean(vercel.ok && 'attached' in vercel && vercel.attached);
  const readyForActive = trafficDns.hasTrafficRecord && vercelReady;

  let nextStatus: CustomDomainStatus = readyForActive ? 'active' : 'dns_verified';
  let message: string;
  let lastError: string | null = null;

  if (readyForActive) {
    message = 'Domain is active — DNS points at Vercel and Vercel reports the hostname as correctly configured.';
  } else if (!trafficDns.hasTrafficRecord) {
    message = OWNERSHIP_CONFIRMED_ADD_CNAME;
    lastError = null;
  } else if (vercelConfig.ok && 'skipped' in vercelConfig && vercelConfig.skipped) {
    message = OWNERSHIP_CONFIRMED_ADD_CNAME;
    lastError = vercelConfig.reason;
  } else if (vercelConfig.ok && 'misconfigured' in vercelConfig && vercelConfig.misconfigured) {
    message =
      'Ownership confirmed and a DNS record was found — Vercel still reports the domain as misconfigured. Wait for propagation, then Recheck.';
    lastError = vercelConfig.detail;
  } else if (!vercelConfig.ok) {
    message = OWNERSHIP_CONFIRMED_ADD_CNAME;
    lastError = vercelConfig.error;
  } else if (vercel.ok && 'skipped' in vercel && vercel.skipped) {
    message = OWNERSHIP_CONFIRMED_ADD_CNAME;
    lastError = vercel.reason;
  } else if (!vercel.ok) {
    message = OWNERSHIP_CONFIRMED_ADD_CNAME;
    lastError = vercel.error;
  } else {
    message = OWNERSHIP_CONFIRMED_ADD_CNAME;
  }

  const recommendedTarget =
    vercelConfig.ok && 'recommendedCNAME' in vercelConfig && vercelConfig.recommendedCNAME
      ? vercelConfig.recommendedCNAME
      : undefined;
  const instructions = dnsInstructions(domain.hostname, domain.verification_token);
  if (recommendedTarget) {
    instructions.cnameTarget = recommendedTarget;
  }

  const { data: updated, error: updErr } = await admin
    .from('custom_domains')
    .update({
      status: nextStatus,
      compiled_application_id: compiledId,
      vercel_attached: vercelAttached,
      verified_at: new Date().toISOString(),
      last_error: lastError,
    })
    .eq('id', domain.id)
    .select('*')
    .single();

  if (updErr) throw new Error(updErr.message);

  return {
    domain: updated as CustomDomainRow,
    vercel,
    vercelConfig,
    trafficDns,
    message,
    instructions,
  };
}

export async function removeCustomDomain(params: {
  ownerId: string;
  domainId: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from('custom_domains')
    .select('id, hostname, compiled_application_id')
    .eq('id', params.domainId)
    .eq('owner_id', params.ownerId)
    .maybeSingle();

  if (!row) throw new Error('Domain not found');

  if (row.compiled_application_id) {
    await admin
      .from('compiled_applications')
      .update({ custom_production_domain: null })
      .eq('id', row.compiled_application_id)
      .eq('custom_production_domain', row.hostname);
  }

  const { error } = await admin.from('custom_domains').delete().eq('id', row.id);
  if (error) throw new Error(error.message);
}

export function customDomainPublicMeta() {
  return {
    vercelConfigured: vercelDomainEnvConfigured(),
    cnameTarget: vercelDnsCnameTarget(),
  };
}
