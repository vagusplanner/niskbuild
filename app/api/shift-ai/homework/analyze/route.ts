import { NextRequest, NextResponse } from 'next/server';
import {
  analyzeHomeworkPhotoDetailed,
  homeworkImageDataUrl,
} from '@/lib/shift-ai/homework';
import { normalizeHomeworkImage } from '@/lib/shift-ai/homework-image';
import {
  getHomeworkPhotoUrl,
  uploadHomeworkPhoto,
} from '@/lib/shift-ai/homework-storage';
import { getStudentLanguage } from '@/lib/shift-ai/study-language';
import { getShiftStudentForRequest } from '@/lib/shift-ai/student-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireShiftPremiumAccess } from '@/lib/shift-ai/plan-access';

export async function POST(request: NextRequest) {
  const auth = await getShiftStudentForRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const premiumBlock = await requireShiftPremiumAccess(request, auth.userId);
  if (premiumBlock) {
    // Keep 402 body shape for UpgradeGate; add explicit code for clients.
    try {
      const clone = premiumBlock.clone();
      const data = (await clone.json()) as Record<string, unknown>;
      return NextResponse.json(
        { ...data, code: data.code || 'SHIFT_PREMIUM_REQUIRED' },
        { status: 402 }
      );
    } catch {
      return premiumBlock;
    }
  }

  try {
    const form = await request.formData();
    const file = form.get('image') as File | null;
    const subject =
      typeof form.get('subject') === 'string' ? String(form.get('subject')).trim() : '';

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: 'Homework photo is required', code: 'MISSING_IMAGE' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const normalized = await normalizeHomeworkImage({
      buffer,
      reportedMime: file.type,
      filename: file.name,
    });

    if (!normalized.ok) {
      const status = normalized.code === 'TOO_LARGE' ? 400 : 400;
      return NextResponse.json(
        { error: normalized.error, code: normalized.code },
        { status }
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

    console.info('[homework-analyze] image ready', {
      kind: normalized.kind,
      bytes: normalized.buffer.length,
      reportedMime: file.type || '(empty)',
      filename: file.name || '(none)',
      studentId: auth.student.id,
    });

    const { id: uploadId } = await uploadHomeworkPhoto(
      auth.student.id,
      subject || null,
      normalized.buffer,
      normalized.contentType
    );

    const studyLanguage = await getStudentLanguage(auth.student.id);
    console.info('[homework-analyze] study language', {
      studentId: auth.student.id,
      studyLanguage,
      uploadId,
    });

    // Prefer inline data URL — Groq cannot always fetch private Supabase signed URLs.
    const visionInput = homeworkImageDataUrl(normalized.buffer, normalized.contentType);
    const vision = await analyzeHomeworkPhotoDetailed(
      visionInput,
      yearGroup,
      studyLanguage
    );

    if (!vision.ok) {
      console.error('[homework-analyze] vision failed', {
        code: vision.code,
        error: vision.error,
        uploadId,
        kind: normalized.kind,
        bytes: normalized.buffer.length,
      });
      return NextResponse.json(
        {
          error:
            vision.code === 'VISION_UNAVAILABLE' || vision.code === 'VISION_MODEL_ERROR'
              ? `${vision.error} This is not a billing/upgrade issue.`
              : 'Could not read this homework photo (image unclear or vision returned nothing). Try a clearer JPEG/PNG photo — this is not a billing/upgrade issue.',
          code: 'VISION_FAILED',
          visionCode: vision.code,
        },
        { status: 503 }
      );
    }

    const aiResponse = vision.text;
    const imageUrl = await getHomeworkPhotoUrl(uploadId);

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
      return NextResponse.json(
        { error: 'Could not save homework analysis', code: 'SAVE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      uploadId: updated.id,
      imageUrl,
      aiResponse,
      expiresAt: updated.extended_until ?? updated.expires_at,
      imageKind: normalized.kind,
    });
  } catch (error) {
    console.error('Shift AI homework analyze failed:', error);
    const message = error instanceof Error ? error.message : 'Homework analysis failed';
    return NextResponse.json({ error: message, code: 'ANALYZE_FAILED' }, { status: 500 });
  }
}
