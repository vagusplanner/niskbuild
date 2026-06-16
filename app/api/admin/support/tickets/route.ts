import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/api-error';
import { requireAdmin } from '@/lib/admin-auth-server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const adminGuard = await requireAdmin(request);
  if (!adminGuard.ok) return adminGuard.response;

  const supabase = createAdminClient();
  const status = request.nextUrl.searchParams.get('status');

  let query = supabase
    .from('support_tickets')
    .select(
      'id, user_id, email, name, subject, category, status, priority, plan_tier, source, created_at, updated_at'
    )
    .order('updated_at', { ascending: false })
    .limit(100);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ tickets: data ?? [] });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
