import { NextRequest, NextResponse } from 'next/server';
import { analyzeHomeworkPhoto } from '@/lib/shift-ai/homework';
import {
  getHomeworkPhotoUrl,
  uploadHomeworkPhoto,
} from '@/lib/shift-ai/homework-storage';
import { getStudentLanguage } from '@/lib/shift-ai/study-language';
import { getShiftStudentForRequest } from '@/lib/shift-ai/student-auth';
import { createAdminClient } from '@/lib/supabase/admin';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

export async function POST(request: NextRequest) {
  const auth = await getShiftStudentForRequest();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const form = await request.formData();
    const file = form.get('image') as File | null;
    const subject =
      typeof form.get('subject') === 'string' ? String(form.get('subject')).trim() : '';

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'Homework photo is required' }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image must be under 10MB' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Image must be JPEG, PNG, WebP, or HEIC' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .schema('firstparty')
      .from('shift_students')
      .select('year_group')
      .eq('id', auth.student.id)
      .maybeSingle();

    const yearGroup = profile?.year_group?.trim() || 'secondary school';
    const buffer = Buffer.from(await file.arrayBuffer());

    const { id: uploadId } = await uploadHomeworkPhoto(
      auth.student.id,
      subject || null,
      buffer,
      file.type || 'image/jpeg'
    );

    const imageUrl = await getHomeworkPhotoUrl(uploadId);
    const aiResponse = await analyzeHomeworkPhoto(
      imageUrl,
      yearGroup,
      await getStudentLanguage(auth.student.id)
    );

    if (!aiResponse) {
      return NextResponse.json(
        { error: 'Failed to analyze homework — vision model unavailable or image unreadable' },
        { status: 503 }
      );
    }

    const { data: updated, error: updateError } = await admin
      .schema('firstparty')
      .from('shift_homework_uploads')
      .update({ ai_response: aiResponse })
      .eq('id', uploadId)
      .eq('student_id', auth.student.id)
      .select('id, expires_at, extended_until')
      .single();

    if (updateError || !updated) {
      console.error('Shift AI homework ai_response save failed:', updateError?.message);
      return NextResponse.json({ error: 'Could not save homework analysis' }, { status: 500 });
    }

    return NextResponse.json({
      uploadId: updated.id,
      imageUrl,
      aiResponse,
      expiresAt: updated.extended_until ?? updated.expires_at,
    });
  } catch (error) {
    console.error('Shift AI homework analyze failed:', error);
    const message = error instanceof Error ? error.message : 'Homework analysis failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
