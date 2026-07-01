import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSafeSession } from '@/lib/supabaseSession.server';

export default async function ShiftAiTeacherPage() {
  const session = await getSafeSession();

  if (!session?.user) {
    redirect('/login?next=/builder/shift-ai/teacher');
  }

  const admin = createAdminClient();
  const { data: teacher } = await admin
    .schema('firstparty')
    .from('shift_teachers')
    .select('school_id')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (!teacher) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <p className="text-lg text-neutral-700">You don&apos;t have teacher access</p>
      </main>
    );
  }

  const { data: students } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('full_name')
    .eq('school_id', teacher.school_id)
    .order('full_name');

  const names =
    students
      ?.map((row) => row.full_name?.trim())
      .filter((name): name is string => Boolean(name)) ?? [];

  const listLabel = names.length > 0 ? names.join(', ') : 'none';

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <p className="text-lg text-neutral-900">Students in your school: {listLabel}</p>
    </main>
  );
}

export async function generateMetadata() {
  return {
    title: 'Shift AI · Teacher',
    robots: 'noindex',
  };
}
