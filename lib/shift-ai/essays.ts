import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export type EssayRow = {
  id: string;
  student_id: string;
  subject: string;
  title: string | null;
  content: string;
  submission_type: 'typed' | 'photo';
  photo_upload_id: string | null;
  ai_feedback: unknown;
  grade_estimate: string | null;
  created_at: string;
  updated_at: string;
};

export async function upsertEssayDraft(input: {
  essayId?: string | null;
  studentId: string;
  subject: string;
  title?: string | null;
  content: string;
  submissionType?: 'typed' | 'photo';
  photoUploadId?: string | null;
  aiFeedback?: unknown;
  gradeEstimate?: string | null;
}): Promise<EssayRow> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  if (input.essayId) {
    const { data, error } = await admin
      .schema('firstparty')
      .from('shift_essays')
      .update({
        subject: input.subject,
        title: input.title ?? null,
        content: input.content,
        submission_type: input.submissionType ?? 'typed',
        photo_upload_id: input.photoUploadId ?? null,
        ai_feedback: input.aiFeedback ?? undefined,
        grade_estimate: input.gradeEstimate ?? null,
        updated_at: now,
      })
      .eq('id', input.essayId)
      .eq('student_id', input.studentId)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Could not update essay');
    }
    return data as EssayRow;
  }

  const { data, error } = await admin
    .schema('firstparty')
    .from('shift_essays')
    .insert({
      student_id: input.studentId,
      subject: input.subject,
      title: input.title ?? null,
      content: input.content,
      submission_type: input.submissionType ?? 'typed',
      photo_upload_id: input.photoUploadId ?? null,
      ai_feedback: input.aiFeedback ?? null,
      grade_estimate: input.gradeEstimate ?? null,
      updated_at: now,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Could not save essay');
  }
  return data as EssayRow;
}
