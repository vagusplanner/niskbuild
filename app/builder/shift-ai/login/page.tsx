import { redirect } from 'next/navigation';
import { getSafeSession } from '@/lib/supabaseSession.server';

/** Shift AI login entry — reuses shared auth with a clean app return path. */
export default async function ShiftAiLoginPage() {
  const session = await getSafeSession();
  if (session?.user) {
    redirect('/builder/shift-ai/dashboard');
  }

  // Use the clean /dashboard next so SuperEduc8 hosts never carry a NiskBuild
  // funnel path (and SE8 sanitize maps this correctly either way).
  redirect('/login?next=/dashboard');
}
