import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSafeSession } from '@/lib/supabaseSession.server';
import ShiftAiOnboardingForm from '@/app/builder/shift-ai/onboarding/ShiftAiOnboardingForm';

export default async function ShiftAiOnboardingPage() {
  const session = await getSafeSession();

  if (!session?.user) {
    redirect('/login?next=/builder/shift-ai/onboarding');
  }

  const admin = createAdminClient();
  const { data: student } = await admin
    .schema('firstparty')
    .from('shift_students')
    .select('id')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (student) {
    redirect('/builder/shift-ai');
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 to-white px-6 py-16">
      <div className="mx-auto max-w-lg">
        <header className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Shift AI</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Set up your profile</h1>
          <p className="mt-3 text-slate-600">Tell us a little about you so we can personalise your tutors.</p>
        </header>
        <ShiftAiOnboardingForm />
      </div>
    </main>
  );
}

export async function generateMetadata() {
  return {
    title: 'Onboarding · Shift AI',
    robots: 'noindex',
  };
}
