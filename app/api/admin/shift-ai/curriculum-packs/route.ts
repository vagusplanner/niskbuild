import { NextRequest, NextResponse } from 'next/server';
import { rowToPack } from '@/lib/shift-ai/curriculum-packs';
import type { CurriculumPackContent } from '@/lib/shift-ai/curriculum-packs-shared';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePlatformOwner } from '@/lib/platform-owner-auth';

export async function GET(request: NextRequest) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  const admin = createAdminClient();
  const { data, error } = await admin
    .schema('firstparty')
    .from('shift_curriculum_packs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    packs: (data ?? []).map((row) => rowToPack(row as Record<string, unknown>)),
  });
}

export async function POST(request: NextRequest) {
  const owner = await requirePlatformOwner(request);
  if (!owner.ok) return owner.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const subject = typeof payload.subject === 'string' ? payload.subject.trim() : '';
  const curriculum = typeof payload.curriculum === 'string' ? payload.curriculum.trim() : '';
  const year_group = typeof payload.year_group === 'string' ? payload.year_group.trim() : '';
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const content = (payload.content as CurriculumPackContent | undefined) ?? null;
  const is_published = payload.is_published !== false;

  if (!subject || !curriculum || !year_group || !title || !content) {
    return NextResponse.json(
      { error: 'subject, curriculum, year_group, title, and content are required' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .schema('firstparty')
    .from('shift_curriculum_packs')
    .insert({
      subject,
      curriculum,
      year_group,
      title,
      content,
      source: 'admin',
      created_by: owner.user.id,
      is_published,
    })
    .select('*')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Could not create pack' }, { status: 500 });
  }

  return NextResponse.json({ pack: rowToPack(data as Record<string, unknown>) });
}
