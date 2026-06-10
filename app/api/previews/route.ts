import { NextRequest, NextResponse } from 'next/server';
import { guardApiRequest } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { isPaidAndActive } from '@/lib/tier-config';
import { getPreviewStatusForUser, upsertPreview } from '@/lib/preview-links';

export async function GET(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const status = await getPreviewStatusForUser(guard.user!.id);
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('preview_restore_count')
    .eq('id', guard.user!.id)
    .single();

  return NextResponse.json({
    ...status,
    restoreCount: profile?.preview_restore_count ?? 0,
  });
}

export async function POST(request: NextRequest) {
  const guard = await guardApiRequest(request);
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_status')
    .eq('id', guard.user!.id)
    .single();

  if (!isPaidAndActive(profile?.subscription_tier, profile?.subscription_status)) {
    return NextResponse.json(
      { error: 'Active paid subscription required for live preview links' },
      { status: 403 }
    );
  }

  const { html, title } = await request.json();
  if (!html || typeof html !== 'string') {
    return NextResponse.json({ error: 'HTML content required' }, { status: 400 });
  }

  const result = await upsertPreview(guard.user!.id, html, title);
  if (!result) {
    return NextResponse.json({ error: 'Failed to create preview link' }, { status: 500 });
  }

  return NextResponse.json({ success: true, ...result });
}
