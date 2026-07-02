import { resolveMentorToken } from '@/lib/shift-ai/token-auth';
import { getObserverSnapshot } from '@/lib/shift-ai/observer';
import { listMentorChallenges } from '@/lib/shift-ai/mentor-challenges';
import ShiftAiMentorViewClient from '@/app/builder/shift-ai/mentor/[token]/ShiftAiMentorViewClient';

interface MentorTokenPageProps {
  params: Promise<{ token: string }>;
}

export default async function ShiftAiMentorTokenPage({ params }: MentorTokenPageProps) {
  const { token } = await params;
  const resolved = await resolveMentorToken(token);

  if (!resolved) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#050d1a] to-[#0a1628] px-4">
        <div className="max-w-sm rounded-2xl bg-white p-10 text-center">
          <p className="mb-4 text-4xl">🔒</p>
          <h2 className="mb-2 text-lg font-bold text-[var(--sa-navy-900)]">Link Not Found</h2>
          <p className="text-sm text-neutral-500">This mentor link is invalid or has expired.</p>
        </div>
      </main>
    );
  }

  const [snapshot, challenges] = await Promise.all([
    getObserverSnapshot(resolved.studentId),
    listMentorChallenges(resolved.studentId),
  ]);

  if (!snapshot) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="text-lg text-neutral-700">Unable to load mentor dashboard.</p>
      </main>
    );
  }

  return (
    <ShiftAiMentorViewClient
      snapshot={snapshot}
      initialChallenges={challenges}
      mentorToken={token}
    />
  );
}

export async function generateMetadata() {
  return {
    title: 'Shift AI · Mentor view',
    robots: 'noindex',
  };
}
