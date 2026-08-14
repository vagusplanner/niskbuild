import 'server-only';

import type { ShiftCurriculum } from '@/lib/shift-ai/constants';
import { isShiftCurriculum, isShiftStudyLanguage, parseStudyLanguage } from '@/lib/shift-ai/constants';
import type { InviteTokenInfo, SettingsProfile } from '@/lib/shift-ai/settings-shared';
import {
  mergeStudentSubjects,
  type ShiftSubjectRow,
} from '@/lib/shift-ai/subjects';
import { deriveKeyStage } from '@/lib/shift-ai/year-group';
import { createAdminClient } from '@/lib/supabase/admin';

export async function getSettingsProfile(studentId: string): Promise<SettingsProfile | null> {
  const admin = createAdminClient();
  const { data: student } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select(
      'id, full_name, curriculum, year_group, key_stage, account_type, favourite_subjects, voice_enabled, preferred_voice, study_language'
    )
    .eq('id', studentId)
    .maybeSingle();

  if (!student) return null;

  const { data: subjectRows } = await admin
    .schema('firstparty')
    .from('shift_subjects')
    .select('id, name, ai_persona, is_favourite')
    .eq('student_id', studentId);

  const favouriteSubjects = (
    Array.isArray(student.favourite_subjects) ? student.favourite_subjects : []
  ).filter((v): v is string => typeof v === 'string' && v.trim().length > 0);

  const accountType = String(student.account_type || 'self') as SettingsProfile['account_type'];

  return {
    id: student.id,
    full_name: student.full_name,
    curriculum: student.curriculum as ShiftCurriculum,
    year_group: student.year_group,
    key_stage: student.key_stage,
    account_type: accountType,
    favourite_subjects: favouriteSubjects,
    voice_enabled: Boolean(student.voice_enabled),
    preferred_voice: student.preferred_voice,
    study_language: parseStudyLanguage(student.study_language, student.curriculum),
    canEditCurriculum: accountType === 'self',
    subjects: mergeStudentSubjects(favouriteSubjects, (subjectRows ?? []) as ShiftSubjectRow[]),
  };
}

export async function updateSettingsProfile(
  studentId: string,
  input: {
    curriculum?: string;
    yearGroup?: string;
    favouriteSubjects?: string[];
    voiceEnabled?: boolean;
    preferredVoice?: string | null;
    studyLanguage?: string;
    subjectPersonas?: Array<{ name: string; aiPersona: string | null }>;
  }
): Promise<void> {
  const admin = createAdminClient();
  const { data: student } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('account_type')
    .eq('id', studentId)
    .maybeSingle();

  if (!student) {
    throw new Error('Student not found');
  }

  const accountType = String(student.account_type || 'self');
  const updates: Record<string, unknown> = {};

  if (accountType === 'self') {
    if (input.curriculum && isShiftCurriculum(input.curriculum)) {
      updates.curriculum = input.curriculum;
    }
    if (input.yearGroup?.trim()) {
      updates.year_group = input.yearGroup.trim();
      const curriculum = (input.curriculum && isShiftCurriculum(input.curriculum)
        ? input.curriculum
        : 'uk') as ShiftCurriculum;
      updates.key_stage = deriveKeyStage(input.yearGroup, curriculum);
    }
  }

  if (input.favouriteSubjects) {
    updates.favourite_subjects = input.favouriteSubjects
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6);
  }

  if (typeof input.voiceEnabled === 'boolean') {
    updates.voice_enabled = input.voiceEnabled;
  }

  if (input.preferredVoice !== undefined) {
    updates.preferred_voice = input.preferredVoice?.trim() || null;
  }

  if (input.studyLanguage && isShiftStudyLanguage(input.studyLanguage)) {
    updates.study_language = input.studyLanguage;
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await admin
      .schema('firstparty')
      .from('shift_students')
      .update(updates)
      .eq('id', studentId);

    if (error) {
      throw new Error(error.message || 'Could not save settings');
    }
  }

  if (input.subjectPersonas?.length) {
    for (const row of input.subjectPersonas) {
      const name = row.name.trim();
      if (!name) continue;

      const { data: existing } = await admin
        .schema('firstparty')
        .from('shift_subjects')
        .select('id')
        .eq('student_id', studentId)
        .ilike('name', name)
        .maybeSingle();

      if (existing?.id) {
        await admin
          .schema('firstparty')
          .from('shift_subjects')
          .update({ ai_persona: row.aiPersona })
          .eq('id', existing.id);
      } else {
        await admin.schema('firstparty').from('shift_subjects').insert({
          student_id: studentId,
          name,
          ai_persona: row.aiPersona,
          is_favourite: true,
        });
      }
    }
  }
}

export async function createParentInviteToken(studentId: string): Promise<InviteTokenInfo> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .schema('firstparty')
    .from('shift_parent_tokens')
    .insert({ student_id: studentId })
    .select('id, token, created_at, revoked_at')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Could not create parent link');
  }

  return {
    ...data,
    linkPath: `/builder/shift-ai/parent/${data.token}`,
  };
}

export async function createMentorInviteToken(studentId: string): Promise<InviteTokenInfo> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .schema('firstparty')
    .from('shift_mentor_tokens')
    .insert({ student_id: studentId })
    .select('id, token, created_at, revoked_at')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Could not create mentor link');
  }

  return {
    ...data,
    linkPath: `/builder/shift-ai/mentor/${data.token}`,
  };
}

export async function listActiveInviteTokens(studentId: string): Promise<{
  parent: InviteTokenInfo[];
  mentor: InviteTokenInfo[];
}> {
  const admin = createAdminClient();

  const [{ data: parent }, { data: mentor }] = await Promise.all([
    admin
      .schema('firstparty')
      .from('shift_parent_tokens')
      .select('id, token, created_at, revoked_at')
      .eq('student_id', studentId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false }),
    admin
      .schema('firstparty')
      .from('shift_mentor_tokens')
      .select('id, token, created_at, revoked_at')
      .eq('student_id', studentId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false }),
  ]);

  return {
    parent: (parent ?? []).map((row) => ({
      ...row,
      linkPath: `/builder/shift-ai/parent/${row.token}`,
    })),
    mentor: (mentor ?? []).map((row) => ({
      ...row,
      linkPath: `/builder/shift-ai/mentor/${row.token}`,
    })),
  };
}
