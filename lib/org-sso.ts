import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { canUseOrgSso } from '@/lib/tier-config';
import { isPendingInvite } from '@/lib/organization-team';

function authBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured');
  return `${url}/auth/v1`;
}

function serviceRoleKey(): string {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error('Service role key is not configured');
  return key;
}

export function normalizeSsoDomain(input: string): string {
  let d = input.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, '');
  d = d.split('/')[0] ?? d;
  d = d.replace(/^@/, '');
  d = d.replace(/^www\./, '');
  return d;
}

export function isValidSsoDomain(domain: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(
    domain
  );
}

export function emailDomain(email: string): string | null {
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2 || !parts[1]) return null;
  return normalizeSsoDomain(parts[1]);
}

type GoTrueSsoProvider = {
  id: string;
  sso_domain?: string;
  domains?: Array<{ domain: string } | string>;
  saml?: { entity_id?: string };
};

async function goTrueSso(
  path: string,
  method: string,
  body?: Record<string, unknown>
): Promise<{ ok: boolean; status: number; data: unknown; errorMessage?: string }> {
  const res = await fetch(`${authBaseUrl()}${path}`, {
    method,
    headers: {
      apikey: serviceRoleKey(),
      Authorization: `Bearer ${serviceRoleKey()}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    let msg = text || `SSO API error (${res.status})`;
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      if (typeof obj.msg === 'string' && obj.msg) msg = obj.msg;
      else if (typeof obj.error_description === 'string' && obj.error_description) {
        msg = obj.error_description;
      } else if (typeof obj.message === 'string' && obj.message) {
        msg = obj.message;
      }
    }
    return { ok: false, status: res.status, data, errorMessage: msg };
  }
  return { ok: true, status: res.status, data };
}

export function friendlySsoError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('saml_provider_disabled')) {
    return 'SAML SSO is not enabled on this NiskBuild Auth project yet. Contact support.';
  }
  if (lower.includes('metadata_fetch') || lower.includes('fetching saml metadata')) {
    return 'Could not fetch SAML metadata from that URL. Check the URL is publicly reachable and returns valid IdP metadata XML.';
  }
  if (lower.includes('metadata') && (lower.includes('parse') || lower.includes('invalid'))) {
    return 'SAML metadata XML is invalid or incomplete. Re-export metadata from your IdP and try again.';
  }
  if (lower.includes('domain') && lower.includes('already')) {
    return 'That email domain is already registered for SSO on another organization.';
  }
  if (lower.includes('entity') && lower.includes('already')) {
    return 'This IdP EntityID is already registered. Update or remove the existing connection first.';
  }
  return raw;
}

export async function createSupabaseSsoProvider(params: {
  domain: string;
  metadataUrl?: string | null;
  metadataXml?: string | null;
}): Promise<{ providerId: string }> {
  const body: Record<string, unknown> = {
    type: 'saml',
    domains: [params.domain],
  };
  if (params.metadataUrl?.trim()) {
    body.metadata_url = params.metadataUrl.trim();
  } else if (params.metadataXml?.trim()) {
    body.metadata_xml = params.metadataXml.trim();
  } else {
    throw new Error('Provide a SAML metadata URL or paste metadata XML.');
  }

  const result = await goTrueSso('/admin/sso/providers', 'POST', body);
  if (!result.ok) {
    throw new Error(friendlySsoError(result.errorMessage || 'Failed to register SSO provider'));
  }

  const provider = result.data as GoTrueSsoProvider;
  if (!provider?.id) {
    throw new Error('SSO provider was created but no provider id was returned.');
  }
  return { providerId: provider.id };
}

export async function updateSupabaseSsoProvider(params: {
  providerId: string;
  domain: string;
  metadataUrl?: string | null;
  metadataXml?: string | null;
}): Promise<void> {
  const body: Record<string, unknown> = {
    domains: [params.domain],
  };
  if (params.metadataUrl?.trim()) body.metadata_url = params.metadataUrl.trim();
  if (params.metadataXml?.trim()) body.metadata_xml = params.metadataXml.trim();

  const result = await goTrueSso(
    `/admin/sso/providers/${params.providerId}`,
    'PUT',
    body
  );
  if (!result.ok) {
    throw new Error(friendlySsoError(result.errorMessage || 'Failed to update SSO provider'));
  }
}

export async function deleteSupabaseSsoProvider(providerId: string): Promise<void> {
  const result = await goTrueSso(`/admin/sso/providers/${providerId}`, 'DELETE');
  if (!result.ok && result.status !== 404) {
    throw new Error(friendlySsoError(result.errorMessage || 'Failed to remove SSO provider'));
  }
}

export type OrgSsoConfig = {
  orgId: string;
  orgName: string;
  ssoProviderId: string | null;
  ssoDomain: string | null;
  ssoEnabled: boolean;
};

export async function getOrgSsoForOwner(orgId: string): Promise<OrgSsoConfig | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('organizations')
    .select('id, name, sso_provider_id, sso_domain, sso_enabled')
    .eq('id', orgId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    orgId: data.id as string,
    orgName: data.name as string,
    ssoProviderId: (data.sso_provider_id as string) || null,
    ssoDomain: (data.sso_domain as string) || null,
    ssoEnabled: !!data.sso_enabled,
  };
}

export async function findEnabledOrgBySsoDomain(
  domain: string
): Promise<{ orgId: string; orgName: string; ssoProviderId: string } | null> {
  const normalized = normalizeSsoDomain(domain);
  if (!normalized) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('organizations')
    .select('id, name, sso_provider_id, sso_domain, sso_enabled')
    .eq('sso_enabled', true)
    .ilike('sso_domain', normalized)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.sso_provider_id) return null;
  return {
    orgId: data.id as string,
    orgName: (data.name as string) || 'your organization',
    ssoProviderId: data.sso_provider_id as string,
  };
}

/**
 * After SSO login: accept a pending invite for this email/org if present.
 * Does not JIT-create membership without an invite.
 */
export async function completeSsoInviteIfPresent(params: {
  userId: string;
  email: string;
  orgId: string;
}): Promise<
  | { status: 'already_member'; orgName: string }
  | { status: 'invite_accepted'; orgName: string }
  | { status: 'no_invite'; orgName: string }
> {
  const admin = createAdminClient();
  const email = params.email.trim().toLowerCase();

  const { data: org } = await admin
    .from('organizations')
    .select('name')
    .eq('id', params.orgId)
    .maybeSingle();
  const orgName = (org?.name as string) || 'your organization';

  const { data: existing } = await admin
    .from('organization_members')
    .select('id')
    .eq('org_id', params.orgId)
    .eq('user_id', params.userId)
    .maybeSingle();
  if (existing) {
    return { status: 'already_member', orgName };
  }

  const { data: invites, error } = await admin
    .from('organization_invites')
    .select('*')
    .eq('org_id', params.orgId)
    .ilike('email', email)
    .is('revoked_at', null)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  const pending = (invites ?? []).find((inv) =>
    isPendingInvite({
      accepted_at: inv.accepted_at as string | null,
      revoked_at: inv.revoked_at as string | null,
      expires_at: inv.expires_at as string,
    })
  );

  // Also allow already-accepted invite rows for this email (re-SSO with new auth user id)
  const previouslyAccepted = (invites ?? []).find((inv) => inv.accepted_at);

  const invite = pending || previouslyAccepted;
  if (!invite) {
    return { status: 'no_invite', orgName };
  }

  const role = (invite.role as string) === 'admin' ? 'admin' : 'member';
  const { error: memErr } = await admin.from('organization_members').insert({
    org_id: params.orgId,
    user_id: params.userId,
    role,
  });
  if (memErr && !/duplicate|unique/i.test(memErr.message)) {
    throw new Error(memErr.message);
  }

  if (pending && !pending.accepted_at) {
    await admin
      .from('organization_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', pending.id);
  }

  return {
    status: pending ? 'invite_accepted' : 'already_member',
    orgName,
  };
}

/**
 * Detect a pre-existing non-SSO profile/account with the same email
 * (Supabase does not link SSO identities to password/Google users).
 */
export async function findDuplicateNonSsoAccount(params: {
  userId: string;
  email: string;
}): Promise<{ id: string } | null> {
  const admin = createAdminClient();
  const email = params.email.trim().toLowerCase();

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email')
    .ilike('email', email)
    .neq('id', params.userId)
    .limit(5);

  if (profiles?.length) {
    return { id: profiles[0].id as string };
  }

  // Auth admin list is paginated; try getUserById only for known collisions via identities is hard.
  // Best-effort: scan first page of users for same email (SSO MAU orgs are small).
  try {
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (!error && data?.users) {
      const other = data.users.find(
        (u) =>
          u.id !== params.userId &&
          (u.email || '').toLowerCase() === email &&
          !(u.app_metadata?.provider === 'sso' ||
            (Array.isArray(u.identities) &&
              u.identities.some((id) => String(id.provider || '').includes('sso'))))
      );
      if (other) return { id: other.id };
    }
  } catch {
    // optional
  }

  return null;
}

export async function assertOwnerCanConfigureSso(params: {
  userId: string;
  orgId: string;
  tier: string | null | undefined;
  status: string | null | undefined;
}): Promise<void> {
  if (!canUseOrgSso(params.tier, params.status)) {
    throw new Error(
      'SSO requires an active Team Enterprise or Sovereign plan on the organization billing owner.'
    );
  }
  const admin = createAdminClient();
  const { data: org } = await admin
    .from('organizations')
    .select('billing_owner_id')
    .eq('id', params.orgId)
    .maybeSingle();
  if (!org || org.billing_owner_id !== params.userId) {
    throw new Error('Only the organization owner can configure SSO.');
  }
}
