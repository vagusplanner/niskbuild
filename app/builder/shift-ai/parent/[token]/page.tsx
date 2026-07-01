import { createAdminClient } from '@/lib/supabase/admin';
import { validateParentToken } from '@/lib/shift-ai/token-auth';

interface ParentTokenPageProps {
  params: Promise<{ token: string }>;
}

export default async function ShiftAiParentTokenPage({ params }: ParentTokenPageProps) {
  const { token } = await params;
  const studentId = await validateParentToken(token);

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
    title: 'Shift AI · Parent view',
    robots: 'noindex',
  };
}
