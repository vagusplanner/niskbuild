import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { guardApiRequest } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';
import { buildMyPurchasesResponse } from '@/lib/marketplace-service';

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const supabase = await createClient();
    const payload = await buildMyPurchasesResponse(supabase, guard.user!.id);
    return NextResponse.json(payload);
  } catch (error) {
    return apiErrorResponse(error, 'Failed to load purchases');
  }
}
