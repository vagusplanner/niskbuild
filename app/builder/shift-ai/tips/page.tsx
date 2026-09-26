import { redirect } from 'next/navigation';
import ShiftAiTipsClient from '@/app/builder/shift-ai/tips/ShiftAiTipsClient';
import { getSafeSession } from '@/lib/supabaseSession.server';
import { shiftAiAppPath } from '@/lib/supereduc8-host';

/**
 * SuperEduc8 Tips & Help.
 *
 * On supereduc8.com, public `/tips` is rewritten by the edge proxy to this
 * internal route (`/builder/shift-ai/tips`) — it does NOT serve NiskBuild `/tips`.
 */
export default async function ShiftAiTipsPage() {
  const session = await getSafeSession();
  if (!session?.user) {
    redirect(`/login?next=${encodeURIComponent(shiftAiAppPath('/tips'))}`);
  }

  return <ShiftAiTipsClient />;
}

export async function generateMetadata() {
  return {
    title: 'Tips & Help · SuperEduc8',
    description: 'Short how-tos for SuperEduc8 learning tools, billing, and account.',
    robots: 'noindex',
  };
}
