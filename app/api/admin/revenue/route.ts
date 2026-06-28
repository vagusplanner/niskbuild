import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';
import { fetchRevenueDashboard } from '@/lib/admin/revenue-dashboard';
import { apiErrorResponse } from '@/lib/api-error';

export async function GET(request: NextRequest) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  try {
    const data = await fetchRevenueDashboard();
    return NextResponse.json(data);
  } catch (error) {
    return apiErrorResponse(error, 'Failed to load revenue dashboard');
  }
}
