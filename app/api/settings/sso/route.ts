import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import { captureApiException } from '@/lib/api-error';
import { canUseOrgSso } from '@/lib/tier-config';
import {
  assertOwnerCanConfigureSso,
  createSupabaseSsoProvider,
  deleteSupabaseSsoProvider,
  getOrgSsoForOwner,
  isValidSsoDomain,
  normalizeSsoDomain,
  updateSupabaseSsoProvider,
} from '@/lib/org-sso';
import {
  ensureSoloOrganizationForUser,
  getPrimaryOrgIdForBillingOwner,
} from '@/lib/ensure-organization';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const { user, profile } = await getAuthenticatedProfile();
    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const tier = profile?.subscription_tier;
    const status = profile?.subscription_status;
    const allowed = canUseOrgSso(tier, status);

    await ensureSoloOrganizationForUser({
      userId: user.id,
      email: profile?.email || user.email,
      tier,
      status,
    });

    const orgId = await getPrimaryOrgIdForBillingOwner(user.id);
    if (!orgId) {
      return NextResponse.json({
        allowed: false,
        config: null,
        message: 'SSO is available on Team Enterprise and Sovereign plans.',
      });
    }

    const admin = createAdminClient();
    const { data: org } = await admin
      .from('organizations')
      .select('billing_owner_id')
      .eq('id', orgId)
      .maybeSingle();
    const isOwner = org?.billing_owner_id === user.id;

    const config = await getOrgSsoForOwner(orgId);
    return NextResponse.json({
      allowed: allowed && isOwner,
      isOwner,
      config,
      projectAcsUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')}/auth/v1/sso/saml/acs`,
      projectEntityId: `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')}/auth/v1/sso/saml/metadata`,
    });
  } catch (error) {
    captureApiException(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load SSO settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const { user, profile } = await getAuthenticatedProfile();
    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const tier = profile?.subscription_tier;
    const status = profile?.subscription_status;

    await ensureSoloOrganizationForUser({
      userId: user.id,
      email: profile?.email || user.email,
      tier,
      status,
    });

    const orgId = await getPrimaryOrgIdForBillingOwner(user.id);
    if (!orgId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    await assertOwnerCanConfigureSso({
      userId: user.id,
      orgId,
      tier,
      status,
    });

    const body = await request.json();
    const action = body.action === 'disable' ? 'disable' : 'save';

    const admin = createAdminClient();
    const existing = await getOrgSsoForOwner(orgId);

    if (action === 'disable') {
      if (existing?.ssoProviderId) {
        await deleteSupabaseSsoProvider(existing.ssoProviderId);
      }
      const { error } = await admin
        .from('organizations')
        .update({
          sso_enabled: false,
          sso_provider_id: null,
          sso_domain: null,
        })
        .eq('id', orgId);
      if (error) throw new Error(error.message);
      return NextResponse.json({
        config: await getOrgSsoForOwner(orgId),
        message: 'SSO disabled for this organization.',
      });
    }

    const domain = normalizeSsoDomain(String(body.domain || ''));
    const metadataUrl =
      typeof body.metadataUrl === 'string' ? body.metadataUrl.trim() : '';
    const metadataXml =
      typeof body.metadataXml === 'string' ? body.metadataXml.trim() : '';

    if (!isValidSsoDomain(domain)) {
      return NextResponse.json(
        { error: 'Enter a valid company email domain like acme.com' },
        { status: 400 }
      );
    }
    if (!metadataUrl && !metadataXml) {
      return NextResponse.json(
        { error: 'Provide a SAML metadata URL or paste metadata XML from your IdP.' },
        { status: 400 }
      );
    }

    // Domain uniqueness among other orgs
    const { data: clash } = await admin
      .from('organizations')
      .select('id')
      .eq('sso_enabled', true)
      .ilike('sso_domain', domain)
      .neq('id', orgId)
      .maybeSingle();
    if (clash) {
      return NextResponse.json(
        { error: 'That email domain is already used for SSO by another organization.' },
        { status: 409 }
      );
    }

    let providerId = existing?.ssoProviderId || null;
    try {
      if (providerId) {
        await updateSupabaseSsoProvider({
          providerId,
          domain,
          metadataUrl: metadataUrl || null,
          metadataXml: metadataXml || null,
        });
      } else {
        const created = await createSupabaseSsoProvider({
          domain,
          metadataUrl: metadataUrl || null,
          metadataXml: metadataXml || null,
        });
        providerId = created.providerId;
      }
    } catch (err) {
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? err.message
              : 'Failed to register SAML identity provider with Auth.',
        },
        { status: 400 }
      );
    }

    const { error } = await admin
      .from('organizations')
      .update({
        sso_provider_id: providerId,
        sso_domain: domain,
        sso_enabled: true,
      })
      .eq('id', orgId);
    if (error) throw new Error(error.message);

    return NextResponse.json({
      config: await getOrgSsoForOwner(orgId),
      message: 'SSO connected. Invited teammates can sign in with their work email.',
    });
  } catch (error) {
    captureApiException(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save SSO settings' },
      { status: 400 }
    );
  }
}
