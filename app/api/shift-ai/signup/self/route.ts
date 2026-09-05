import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  isShiftAgeRange,
  isShiftCurriculum,
  defaultStudyLanguageForCurriculum,
} from '@/lib/shift-ai/constants';
import { resolveRequestUser } from '@/lib/shift-ai/student-auth';
import { deriveKeyStage } from '@/lib/shift-ai/year-group';
import {
  shiftAiApiCorsPreflightResponse,
  shiftAiApiJson,
} from '@/lib/shift-ai-api-cors';

function parseFavouriteSubjects(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .slice(0, 3);
}

export async function OPTIONS(request: NextRequest) {
  return shiftAiApiCorsPreflightResponse(request);
}

export async function POST(request: NextRequest) {
  const user = await resolveRequestUser(request);
  if (!user) {
    return shiftAiApiJson(request, { error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return shiftAiApiJson(request, { error: 'Invalid JSON body' }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const fullName = typeof payload.fullName === 'string' ? payload.fullName.trim() : '';
  const curriculum = typeof payload.curriculum === 'string' ? payload.curriculum : '';
  const yearGroup = typeof payload.yearGroup === 'string' ? payload.yearGroup.trim() : '';
  const ageRange = typeof payload.ageRange === 'string' ? payload.ageRange : '';
  const favouriteSubjects = parseFavouriteSubjects(payload.favouriteSubjects);

  if (!fullName || !yearGroup) {
    return shiftAiApiJson(
      request,
      { error: 'Name and year group are required' },
      { status: 400 }
    );
  }

  if (!isShiftCurriculum(curriculum)) {
    return shiftAiApiJson(request, { error: 'Invalid curriculum' }, { status: 400 });
  }

  if (!isShiftAgeRange(ageRange)) {
    return shiftAiApiJson(request, { error: 'Invalid age range' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    return shiftAiApiJson(
      request,
      { error: 'Student profile already exists' },
      { status: 409 }
    );
  }

  const { error } = await admin.schema('firstparty').from('shift_students').insert({
    user_id: user.id,
    full_name: fullName,
    curriculum,
    year_group: yearGroup,
    key_stage: deriveKeyStage(yearGroup, curriculum),
    age_range: ageRange,
    favourite_subjects: favouriteSubjects,
    account_type: 'self',
    is_active: true,
    parent_consent_given: false,
    study_language: defaultStudyLanguageForCurriculum(curriculum),
  });

  if (error) {
    console.error('Shift AI self signup insert failed:', error.message);
    return shiftAiApiJson(
      request,
      { error: 'Could not create student profile' },
      { status: 500 }
    );
  }

  return shiftAiApiJson(request, { ok: true });
}
