import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

/** Clears preview_restore_count after user sees welcome-back notification */
export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  await supabase
    .from('profiles')
    .update({ preview_restore_count: 0 })
    .eq('id', guard.user!.id);

  return NextResponse.json({ success: true });
}
