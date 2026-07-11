import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { getAuthenticatedProfile } from '@/lib/server-profile';
import { canUseCustomDomains } from '@/lib/tier-config';
import {
  claimCustomDomain,
  customDomainPublicMeta,
  dnsInstructions,
  listCustomDomainsForOwner,
  removeCustomDomain,
  verifyCustomDomainDns,
} from '@/lib/custom-domains';
import { captureApiException } from '@/lib/api-error';

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const { user, profile } = await getAuthenticatedProfile();
    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const tier = profile?.subscription_tier ?? null;
    const status = profile?.subscription_status ?? null;
    const eligible = canUseCustomDomains(tier, status);
    const domains = eligible ? await listCustomDomainsForOwner(user.id) : [];

    return NextResponse.json({
      eligible,
      domains: domains.map((d) => ({
        ...d,
        instructions: dnsInstructions(d.hostname, d.verification_token),
      })),
      meta: customDomainPublicMeta(),
    });
  } catch (error) {
    captureApiException(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load domains' },
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

    const body = await request.json();
    const hostname = typeof body.hostname === 'string' ? body.hostname : '';
    const result = await claimCustomDomain({
      ownerId: user.id,
      tier: profile?.subscription_tier,
      status: profile?.subscription_status,
      hostnameInput: hostname,
    });

    return NextResponse.json({
      domain: result.domain,
      instructions: result.instructions,
      meta: customDomainPublicMeta(),
    });
  } catch (error) {
    captureApiException(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to claim domain' },
      { status: 400 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const { user, profile } = await getAuthenticatedProfile();
    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const body = await request.json();
    const domainId = typeof body.id === 'string' ? body.id : '';
    const action = body.action;

    if (action === 'verify') {
      const result = await verifyCustomDomainDns({
        ownerId: user.id,
        domainId,
        tier: profile?.subscription_tier,
        status: profile?.subscription_status,
      });
      return NextResponse.json({
        domain: result.domain,
        vercel: result.vercel,
        instructions: result.instructions,
        meta: customDomainPublicMeta(),
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    captureApiException(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Verification failed' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const { user } = await getAuthenticatedProfile();
    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const domainId = searchParams.get('id');
    if (!domainId) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    await removeCustomDomain({ ownerId: user.id, domainId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    captureApiException(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove domain' },
      { status: 400 }
    );
  }
}
