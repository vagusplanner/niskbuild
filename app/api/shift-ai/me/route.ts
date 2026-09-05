import { NextRequest } from 'next/server';
import { getFavouriteSubjects, needsSubjectOnboarding } from '@/lib/shift-ai/onboarding';
import { getShiftStudentForRequest } from '@/lib/shift-ai/student-auth';
import {
  shiftAiApiCorsPreflightResponse,
  shiftAiApiJson,
} from '@/lib/shift-ai-api-cors';

export async function OPTIONS(request: NextRequest) {
  return shiftAiApiCorsPreflightResponse(request);
}

/** Bootstrap profile for the Shift AI SPA — auth + onboarding gate inputs. */
export async function GET(request: NextRequest) {
  const auth = await getShiftStudentForRequest(request);
  if (!auth.ok) {
    return shiftAiApiJson(request, { error: auth.error }, { status: auth.status });
  }

  const student = auth.student;
  const favouriteSubjects = getFavouriteSubjects(student);
  const needsOnboarding = needsSubjectOnboarding(student);
  const isActive = student.is_active !== false;

  return shiftAiApiJson(request, {
    userId: auth.userId,
    student: {
      id: student.id,
      fullName: student.full_name ?? '',
      curriculum: student.curriculum ?? 'uk',
      yearGroup: student.year_group ?? '',
      ageRange: student.age_range ?? '',
      accountType: student.account_type ?? 'self',
      studyLanguage: student.study_language ?? 'en',
      favouriteSubjects,
      isActive,
      needsOnboarding,
    },
  });
}
