import { validateParentToken } from '@/lib/shift-ai/token-auth';
import { getObserverSnapshot } from '@/lib/shift-ai/observer';
import ShiftAiParentDashboardClient from '@/app/builder/shift-ai/parent/[token]/ShiftAiParentDashboardClient';

interface ParentTokenPageProps {
  params: Promise<{ token: string }>;
}

export default async function ShiftAiParentTokenPage({ params }: ParentTokenPageProps) {
  const { token } = await params;
  const studentId = await validateParentToken(token);

  if (!studentId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#050d1a] to-[#0a1628] px-4">
        <div className="max-w-sm rounded-2xl bg-white p-10 text-center">
          <p className="mb-4 text-4xl">🔒</p>
          <h2 className="mb-2 text-lg font-bold text-[var(--sa-navy-900)]">Link Not Found</h2>
          <p className="text-sm text-neutral-500">This link is invalid or has expired.</p>
        </div>
      </main>
    );
  }

  const snapshot = await getObserverSnapshot(studentId);
  if (!snapshot) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="text-lg text-neutral-700">Unable to load this dashboard.</p>
      </main>
    );
  }

  return <ShiftAiParentDashboardClient snapshot={snapshot} />;
}

export async function generateMetadata() {
  return {
    title: 'Shift AI · Parent view',
    robots: 'noindex',
  };
}
