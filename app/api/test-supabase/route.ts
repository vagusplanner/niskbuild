import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

/** Dev-only connectivity check — requires authenticated session. */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('waitlist')
      .select('count', { count: 'exact', head: true });

    return NextResponse.json({
      connected: !error,
      error: error?.message,
    });
  } catch (error) {
    return NextResponse.json({
      connected: false,
      error: String(error),
    });
  }
}
