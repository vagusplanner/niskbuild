import { NextRequest, NextResponse } from 'next/server';
import { analyzeHomeworkPhoto } from '@/lib/shift-ai/homework';
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

    const { id: uploadId } = await uploadHomeworkPhoto(
      auth.student.id,
      subject || null,
      normalized.buffer,
      normalized.contentType
    );

    const imageUrl = await getHomeworkPhotoUrl(uploadId);
    const aiResponse = await analyzeHomeworkPhoto(
      imageUrl,
      yearGroup,
      await getStudentLanguage(auth.student.id)
    );

    if (!aiResponse) {
      return NextResponse.json(
        {
          error:
            'Could not read this homework photo (vision model unavailable or image unclear). Try a clearer JPEG/PNG photo — this is not a billing/upgrade issue.',
          code: 'VISION_FAILED',
        },
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
