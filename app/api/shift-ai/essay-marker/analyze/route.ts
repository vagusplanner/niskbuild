import { NextRequest, NextResponse } from 'next/server';
import { upsertEssayDraft } from '@/lib/shift-ai/essays';
import { markEssay } from '@/lib/shift-ai/essay-marker';
import { transcribeEssayPhoto } from '@/lib/shift-ai/homework';
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
    const contentType = request.headers.get('content-type') || '';
    const admin = createAdminClient();

    const { data: profile } = await admin
      .schema('firstparty')
      .from('shift_students')
      .select('year_group, curriculum')
      .eq('id', auth.student.id)
      .maybeSingle();

    const yearGroup = profile?.year_group?.trim() || 'secondary school';
    const curriculum = String(profile?.curriculum || 'uk');

    let essayText = '';
    let subject = '';
    let examBoard = '';
    let level = '';
    let questionText = '';
    let photoUploadId: string | null = null;
    let photoExpiresAt: string | null = null;
    let photoImageUrl: string | null = null;
    let submissionType: 'typed' | 'photo' = 'typed';

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('image') as File | null;
      subject = typeof form.get('subject') === 'string' ? String(form.get('subject')).trim() : '';
      examBoard =
        typeof form.get('examBoard') === 'string' ? String(form.get('examBoard')).trim() : '';
      level = typeof form.get('level') === 'string' ? String(form.get('level')).trim() : '';
      questionText =
        typeof form.get('questionText') === 'string' ? String(form.get('questionText')).trim() : '';
      essayText =
        typeof form.get('essayText') === 'string' ? String(form.get('essayText')).trim() : '';

      if (file && file.size > 0) {
        if (file.size > MAX_IMAGE_BYTES) {
          return NextResponse.json({ error: 'Image must be under 10MB' }, { status: 400 });
        }
        if (!ALLOWED_TYPES.has(file.type)) {
          return NextResponse.json(
            { error: 'Image must be JPEG, PNG, WebP, or HEIC' },
            { status: 400 }
          );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const upload = await uploadHomeworkPhoto(
          auth.student.id,
          subject || null,
          buffer,
          file.type || 'image/jpeg'
        );
        photoUploadId = upload.id;
        submissionType = 'photo';

        photoImageUrl = await getHomeworkPhotoUrl(photoUploadId);
        const transcribed = await transcribeEssayPhoto(photoImageUrl);
        if (!transcribed) {
          return NextResponse.json(
            { error: 'Could not read essay photo — vision model unavailable or image unclear' },
            { status: 503 }
          );
        }
        essayText = transcribed;

        const { data: uploadRow } = await admin
          .schema('firstparty')
          .from('shift_homework_uploads')
          .select('expires_at, extended_until')
          .eq('id', photoUploadId)
          .single();
        photoExpiresAt = uploadRow?.extended_until ?? uploadRow?.expires_at ?? null;
      }
    } else {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
      }
      const payload = body as Record<string, unknown>;
      essayText = typeof payload.essayText === 'string' ? payload.essayText.trim() : '';
      subject = typeof payload.subject === 'string' ? payload.subject.trim() : '';
      examBoard = typeof payload.examBoard === 'string' ? payload.examBoard.trim() : '';
      level = typeof payload.level === 'string' ? payload.level.trim() : '';
      questionText =
        typeof payload.questionText === 'string' ? payload.questionText.trim() : '';
    }

    if (!essayText || !subject || !examBoard || !level) {
      return NextResponse.json(
        { error: 'Essay text, subject, exam board, and level are required' },
        { status: 400 }
      );
    }

    const result = await markEssay({
      essayText,
      subject,
      examBoard,
      level,
      questionText: questionText || undefined,
      yearGroup,
      curriculum,
      language: await getStudentLanguage(auth.student.id),
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 503 });
    }

    const essay = await upsertEssayDraft({
      studentId: auth.student.id,
      subject,
      title: questionText || null,
      content: essayText,
      submissionType,
      photoUploadId,
      aiFeedback: result.feedback,
      gradeEstimate: result.feedback.grade_estimate,
    });

    return NextResponse.json({
      essayId: essay.id,
      essayText,
      feedback: result.feedback,
      photoUploadId,
      photoImageUrl,
      photoExpiresAt,
    });
  } catch (error) {
    console.error('Essay marker analyze failed:', error);
    const message = error instanceof Error ? error.message : 'Essay marking failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
