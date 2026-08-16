import { redirect } from 'next/navigation';
import ShiftAiTeacherClient from '@/app/builder/shift-ai/teacher/ShiftAiTeacherClient';
import { shiftAiCatalog } from '@/lib/shift-ai/i18n';
import { getTeacherForUser, listTeacherStudents } from '@/lib/shift-ai/teacher';
import { getRequestStudyLanguage } from '@/lib/shift-ai/study-language';
import { getSafeSession } from '@/lib/supabaseSession.server';

export default async function ShiftAiTeacherPage() {
  const session = await getSafeSession();

  if (!session?.user) {
    redirect('/login?next=/builder/shift-ai/teacher');
  }

  const teacher = await getTeacherForUser(session.user.id);
  const catalog = shiftAiCatalog(await getRequestStudyLanguage()).teacher;

  if (!teacher) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="mb-4 text-5xl">🔒</p>
          <h2 className="mb-2 text-xl font-bold text-[var(--sa-navy-900)]">{catalog.lockedTitle}</h2>
          <p className="text-sm text-neutral-500">{catalog.lockedBody}</p>
        </div>
      </main>
    );
  }

  const students = await listTeacherStudents(teacher.school_id);

  return <ShiftAiTeacherClient students={students} />;
}

export async function generateMetadata() {
  return {
    title: shiftAiCatalog(await getRequestStudyLanguage()).teacher.metaTitle,
    robots: 'noindex',
  };
}
