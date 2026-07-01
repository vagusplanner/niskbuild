import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSafeSession } from '@/lib/supabaseSession.server';

export default async function ShiftAiStudentPage() {
  const session = await getSafeSession();

  if (!session?.user) {
    redirect('/login?next=/builder/shift-ai');
  }

  const admin = createAdminClient();
  const { data: student } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('full_name')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!student) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <p className="text-lg text-neutral-700">
          Welcome — your Shift AI profile is being set up
        </p>
      </main>
    );
  }

  const fullName = student.full_name?.trim() || 'Student';

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <p className="text-lg text-neutral-900">Hello, {fullName}</p>
    </main>
  );
}

export async function generateMetadata() {
  return {
    title: 'Shift AI',
    robots: 'noindex',
  };
}
