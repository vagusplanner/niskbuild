import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';
import { listAllCustomDomainsForAdmin } from '@/lib/custom-domains';
import { captureApiException } from '@/lib/api-error';

export async function GET(request: NextRequest) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const domains = await listAllCustomDomainsForAdmin();
    const stats = {
      total: domains.length,
      pending: domains.filter((d) => d.status === 'pending_dns' || d.status === 'failed').length,
      dnsVerified: domains.filter((d) => d.status === 'dns_verified').length,
      active: domains.filter((d) => d.status === 'active').length,
    };
    return NextResponse.json({ domains, stats });
  } catch (error) {
    captureApiException(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list domains' },
      { status: 500 }
    );
  }
}
