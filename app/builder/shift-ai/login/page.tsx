import { redirect } from 'next/navigation';
import { getSafeSession } from '@/lib/supabaseSession.server';

/** Shift AI login entry — reuses NiskBuild auth with dashboard return path. */
export default async function ShiftAiLoginPage() {
  const session = await getSafeSession();
  if (session?.user) {
    redirect('/builder/shift-ai/dashboard');
  }

  redirect('/login?next=/builder/shift-ai/dashboard');
}
