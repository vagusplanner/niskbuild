import { NextRequest, NextResponse } from 'next/server';
import { generateCurriculumPack } from '@/lib/shift-ai/curriculum-packs';
import { PACK_TYPES } from '@/lib/shift-ai/curriculum-packs-shared';
import { getShiftStudentForRequest } from '@/lib/shift-ai/student-auth';
import { createAdminClient } from '@/lib/supabase/admin';

const VALID_PACK_TYPES = new Set<string>(PACK_TYPES);

export async function POST(request: NextRequest) {
  const auth = await getShiftStudentForRequest();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const subject = typeof payload.subject === 'string' ? payload.subject.trim() : '';
  const topic = typeof payload.topic === 'string' ? payload.topic.trim() : '';
  const packType =
    typeof payload.packType === 'string' && VALID_PACK_TYPES.has(payload.packType)
      ? payload.packType
      : PACK_TYPES[0];
  const examBoard =
    typeof payload.examBoard === 'string' && payload.examBoard.trim()
      ? payload.examBoard.trim()
      : undefined;

  if (!subject || !topic) {
    return NextResponse.json({ error: 'subject and topic are required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('year_group, curriculum')
    .eq('id', auth.student.id)
    .maybeSingle();

  const yearGroup = profile?.year_group?.trim() || 'secondary school';
  const curriculum = String(profile?.curriculum || 'uk');

  const result = await generateCurriculumPack({
    subject,
    curriculum,
    yearGroup,
    topic,
    packType,
    examBoard,
    createdBy: auth.userId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  return NextResponse.json({ pack: result.pack, reused: result.reused });
}
