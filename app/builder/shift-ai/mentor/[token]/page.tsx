import { createAdminClient } from '@/lib/supabase/admin';
import { validateMentorToken } from '@/lib/shift-ai/token-auth';

interface MentorTokenPageProps {
  params: Promise<{ token: string }>;
}

export default async function ShiftAiMentorTokenPage({ params }: MentorTokenPageProps) {
  const { token } = await params;
  const studentId = await validateMentorToken(token);

  if (!studentId) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <p className="text-lg text-neutral-700">This link is invalid or has expired</p>
      </main>
    );
  }

  const admin = createAdminClient();
  const { data: student } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('full_name')
    .eq('id', studentId)
    .maybeSingle();

  const fullName = student?.full_name?.trim() || 'Student';

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <p className="text-lg text-neutral-900">Hello, {fullName}</p>
    </main>
  );
}

export async function generateMetadata() {
  return {
    title: 'Shift AI · Mentor view',
    robots: 'noindex',
  };
}
