import { redirect } from 'next/navigation';
import ShiftAiVoiceTutorClient from '@/app/builder/shift-ai/voice-tutor/ShiftAiVoiceTutorClient';
import { createAdminClient } from '@/lib/supabase/admin';
import { needsSubjectOnboarding } from '@/lib/shift-ai/onboarding';
import { getSafeSession } from '@/lib/supabaseSession.server';

export default async function ShiftAiVoiceTutorPage() {
  const session = await getSafeSession();

  if (!session?.user) {
    redirect('/builder/shift-ai/login');
  }

  const admin = createAdminClient();
  const { data: student } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('id, favourite_subjects, year_group, preferred_voice, study_language, curriculum, voice_enabled')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!student || needsSubjectOnboarding(student)) {
    redirect('/builder/shift-ai/onboarding');
  }

  const subjectOptions = (
    Array.isArray(student.favourite_subjects) ? student.favourite_subjects : []
  ).filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  const { studyLanguageFromStudent } = await import('@/lib/shift-ai/study-language');
  const studyLanguage = studyLanguageFromStudent(student);

  return (
    <ShiftAiVoiceTutorClient
      subjectOptions={subjectOptions}
      yearGroup={student.year_group || 'secondary school'}
      preferredVoice={student.preferred_voice}
      studyLanguage={studyLanguage}
      voiceEnabled={student.voice_enabled !== false}
    />
  );
}

export async function generateMetadata() {
  return {
    title: 'Voice Tutor · SuperEduc8',
    robots: 'noindex',
  };
}
