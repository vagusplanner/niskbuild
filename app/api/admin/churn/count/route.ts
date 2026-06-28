import { NextRequest, NextResponse } from 'next/server';
import { countChurnRiskUsers } from '@/lib/email/churn';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';

export async function GET(request: NextRequest) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  const count = await countChurnRiskUsers();
  return NextResponse.json({ count });
}
