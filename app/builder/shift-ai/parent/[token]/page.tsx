import { validateParentToken } from '@/lib/shift-ai/token-auth';
import { getObserverSnapshot } from '@/lib/shift-ai/observer';
import ShiftAiParentDashboardClient from '@/app/builder/shift-ai/parent/[token]/ShiftAiParentDashboardClient';
import { shiftAiCatalog } from '@/lib/shift-ai/i18n';
import { getRequestStudyLanguage } from '@/lib/shift-ai/study-language';

interface ParentTokenPageProps {
  params: Promise<{ token: string }>;
}

export default async function ShiftAiParentTokenPage({ params }: ParentTokenPageProps) {
  const { token } = await params;
  const studentId = await validateParentToken(token);
  const copy = shiftAiCatalog(await getRequestStudyLanguage()).parentView;

  if (!studentId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#050d1a] to-[#0a1628] px-4">
        <div className="max-w-sm rounded-2xl bg-white p-10 text-center">
          <p className="mb-4 text-4xl">🔒</p>
          <h2 className="mb-2 text-lg font-bold text-[var(--sa-navy-900)]">{copy.linkNotFound}</h2>
          <p className="text-sm text-neutral-500">{copy.linkExpired}</p>
        </div>
      </main>
    );
  }

  const snapshot = await getObserverSnapshot(studentId);
  if (!snapshot) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="text-lg text-neutral-700">{copy.loadFailed}</p>
      </main>
    );
  }

  return <ShiftAiParentDashboardClient snapshot={snapshot} />;
}

export async function generateMetadata() {
  return {
    title: shiftAiCatalog(await getRequestStudyLanguage()).parentView.metaTitle,
    robots: 'noindex',
  };
}
