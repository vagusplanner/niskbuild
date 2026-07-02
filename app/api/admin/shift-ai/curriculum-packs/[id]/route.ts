import { NextRequest, NextResponse } from 'next/server';
import { rowToPack } from '@/lib/shift-ai/curriculum-packs';
import type { CurriculumPackContent } from '@/lib/shift-ai/curriculum-packs-shared';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const updates: Record<string, unknown> = {};

  if (typeof payload.subject === 'string') updates.subject = payload.subject.trim();
  if (typeof payload.curriculum === 'string') updates.curriculum = payload.curriculum.trim();
  if (typeof payload.year_group === 'string') updates.year_group = payload.year_group.trim();
  if (typeof payload.title === 'string') updates.title = payload.title.trim();
  if (payload.content) updates.content = payload.content as CurriculumPackContent;
  if (typeof payload.is_published === 'boolean') updates.is_published = payload.is_published;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .schema('firstparty')
    .from('shift_curriculum_packs')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Could not update pack' }, { status: 500 });
  }

  return NextResponse.json({ pack: rowToPack(data as Record<string, unknown>) });
}
